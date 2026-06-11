const fs = require('fs/promises');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const {
  EXTENSION_VERSION,
  PRODUCT_NAME,
  PREF_ENTRY_TYPE,
  SOURCE_ENTRY_TYPE,
  EXPORT_ENTRY_TYPE,
  COMMENT_ENTRY_TYPE,
  LONG_ANSWER_DEFAULTS,
} = require('../constants');
const { sha, countLines, countParagraphs, wordCount } = require('../text');
const { renderMarkdownish } = require('../markdown');
const { deriveTitle } = require('../document');
const { writeHtmlArtifact, writeRichHtmlArtifact } = require('../artifacts');
const { validateCommentBundle, buildCommentsPrompt } = require('../comments');
const { extractMessageInfo, isLongAnswer, extractHtmlDocument } = require('./messages');
const { parseArgs, parseHtmlCommandInput, resolveForcedExportMode, hasSelectableUi } = require('./parse');
const { openArtifact } = require('./open');
const { buildRichHtmlPrompt } = require('./prompts');

const execFileAsync = promisify(execFile);

module.exports = function htmlLongAnswerExtension(pi) {
  const state = {
    offerMode: 'ask',
    lastEligible: null,
    lastExport: null,
    pendingRichExport: null,
    lastPromptedSignature: null,
    geminiAvailable: null,
    config: { ...LONG_ANSWER_DEFAULTS },
  };

  function rememberFromEntry(entry) {
    if (!entry || entry.type !== 'custom') return;
    if (entry.customType === PREF_ENTRY_TYPE && entry.data && typeof entry.data.offerMode === 'string') {
      state.offerMode = entry.data.offerMode;
    }
    if (entry.customType === SOURCE_ENTRY_TYPE && entry.data && entry.data.text) {
      state.lastEligible = entry.data;
    }
    if (entry.customType === EXPORT_ENTRY_TYPE && entry.data && entry.data.path) {
      state.lastExport = entry.data;
    }
  }

  function hydrateLastEligibleFromBranch(branch) {
    if (!Array.isArray(branch) || state.lastEligible) return;
    for (let index = branch.length - 1; index >= 0; index -= 1) {
      const info = extractMessageInfo(branch[index]);
      if (info && info.text) {
        state.lastEligible = buildSourceRecord(info.text);
        return;
      }
    }
  }

  async function restoreSessionState(ctx) {
    try {
      const branch =
        ctx && ctx.sessionManager && typeof ctx.sessionManager.getBranch === 'function'
          ? ctx.sessionManager.getBranch()
          : [];
      if (!Array.isArray(branch)) return;
      for (const entry of branch) rememberFromEntry(entry);
      hydrateLastEligibleFromBranch(branch);
    } catch (_) {
      // Best effort only.
    }
  }

  async function appendCustomEntry(type, data) {
    if (typeof pi.appendEntry !== 'function') return;
    try {
      await pi.appendEntry(type, data);
    } catch (_) {
      // Do not fail the user flow on persistence issues.
    }
  }

  async function setOfferMode(mode) {
    state.offerMode = mode;
    await appendCustomEntry(PREF_ENTRY_TYPE, { offerMode: mode, savedAt: Date.now() });
  }

  async function rememberEligibleSource(source) {
    state.lastEligible = source;
    const { text: _text, ...persistedSource } = source;
    await appendCustomEntry(SOURCE_ENTRY_TYPE, persistedSource);
  }

  async function rememberExport(meta) {
    state.lastExport = meta;
    await appendCustomEntry(EXPORT_ENTRY_TYPE, meta);
  }

  function notify(ctx, message, level) {
    if (!ctx || !ctx.ui || typeof ctx.ui.notify !== 'function') return;
    try {
      const result = ctx.ui.notify(message, level || 'info');
      if (result && typeof result.then === 'function') {
        result.catch(() => {});
      }
    } catch (_) {
      // Ignore UI failures.
    }
  }

  function notifyCommandError(ctx, error) {
    notify(
      ctx,
      `${PRODUCT_NAME} command error: ${error && error.message ? error.message : String(error)} [${PRODUCT_NAME} ${EXTENSION_VERSION}]`,
      'error'
    );
  }

  async function isGeminiCliAvailable() {
    if (typeof state.geminiAvailable === 'boolean') return state.geminiAvailable;
    try {
      await execFileAsync('gemini', ['--help'], { timeout: 3000, maxBuffer: 512 * 1024 });
      state.geminiAvailable = true;
    } catch (_) {
      state.geminiAvailable = false;
    }
    return state.geminiAvailable;
  }

  async function maybeOpenArtifact(ctx, filePath, mode) {
    const opened = await openArtifact(filePath);
    if (!opened) return false;
    notify(
      ctx,
      `${mode === 'local' ? 'Opened local HTML export' : 'Opened designed HTML export'} in your default browser. [${PRODUCT_NAME} ${EXTENSION_VERSION}]`,
      'info'
    );
    return true;
  }

  function buildSourceRecord(text) {
    const title = deriveTitle(text);
    return {
      id: sha(text),
      title,
      text,
      recordedAt: Date.now(),
      stats: {
        characters: text.length,
        lines: countLines(text),
        paragraphs: countParagraphs(text),
        words: wordCount(text),
      },
    };
  }

  async function exportLocalHtml(ctx, source, mode) {
    const bodyHtml = renderMarkdownish(source.text);
    const filePath = await writeHtmlArtifact({
      title: source.title,
      bodyHtml,
      sourceText: source.text,
      mode: mode || 'local',
    });
    const meta = {
      path: filePath,
      mode: mode || 'local',
      title: source.title,
      sourceId: source.id,
      exportedAt: Date.now(),
    };
    await rememberExport(meta);
    await notify(
      ctx,
      `HTML export written to ${filePath}. Use /html-last rich or /htmlify rich for a more designed HTML pass. [${PRODUCT_NAME} ${EXTENSION_VERSION}]`,
      'info'
    );
    await maybeOpenArtifact(ctx, filePath, 'local');
    return meta;
  }

  async function exportRichHtmlResult(ctx, source, htmlText) {
    const filePath = await writeRichHtmlArtifact({
      title: source.title,
      htmlText,
      sourceId: source.id,
    });
    const meta = {
      path: filePath,
      mode: 'llm-enhanced',
      title: source.title,
      sourceId: source.id,
      exportedAt: Date.now(),
    };
    await rememberExport(meta);
    await notify(ctx, `Designed HTML export written to ${filePath}. [${PRODUCT_NAME} ${EXTENSION_VERSION}]`, 'info');
    await maybeOpenArtifact(ctx, filePath, 'designed');
    return meta;
  }

  function normalizeChoice(result, options) {
    if (typeof result === 'string') return result;
    if (typeof result === 'number') {
      if (Array.isArray(options) && options[result]) return options[result].value;
      return ['local', 'rich', 'inline', 'never'][result] || null;
    }
    if (result && typeof result === 'object') {
      return result.value || result.id || result.key || result.choice || null;
    }
    return null;
  }

  async function promptWithSelect(ui, summary) {
    const geminiAvailable = await isGeminiCliAvailable();
    const options = [
      { label: 'Designed HTML with Gemini CLI', value: 'rich-gemini' },
      { label: 'Designed HTML with current Pi model', value: 'rich-pi' },
      { label: 'Quick local HTML', value: 'local' },
      { label: 'Keep inline', value: 'inline' },
      { label: 'Stop asking this session', value: 'never' },
    ];
    if (!geminiAvailable) {
      options.shift();
    }

    const prompt = `Long answer detected: ${summary}`;
    try {
      const result = await ui.select(prompt, options);
      return normalizeChoice(result, options) || null;
    } catch (_) {
      return null;
    }
  }

  async function promptUserForExport(ctx, source) {
    if (!ctx || !ctx.ui || state.offerMode === 'never') return 'inline';
    const summary = [
      `${source.stats.words} words`,
      `${source.stats.paragraphs} paragraphs`,
      `${source.stats.lines} lines`,
    ].join(' · ');

    if (typeof ctx.ui.select === 'function') {
      const selected = await promptWithSelect(ctx.ui, summary);
      if (selected) return selected;
    }

    return 'inline';
  }

  async function queueRichExport(source, ctx, renderer) {
    if (renderer === 'gemini') {
      await notify(ctx, 'Generating designed HTML with Gemini CLI…', 'info');
      try {
        const html = await runGeminiRichExport(source);
        await exportRichHtmlResult(ctx, source, html);
      } catch (error) {
        await notify(
          ctx,
          `Gemini designed HTML failed: ${error && error.message ? error.message : String(error)}. Falling back to quick local HTML. [${PRODUCT_NAME} ${EXTENSION_VERSION}]`,
          'warning'
        );
        await exportLocalHtml(ctx, source, 'local');
      }
      return;
    }

    state.pendingRichExport = {
      requestedAt: Date.now(),
      source,
    };
    await notify(ctx, 'Queued richer HTML generation as a follow-up turn.', 'info');
    if (typeof pi.sendUserMessage === 'function') {
      await pi.sendUserMessage(buildRichHtmlPrompt(source), { deliverAs: 'followUp' });
      return;
    }
    if (typeof pi.sendMessage === 'function') {
      await pi.sendMessage(buildRichHtmlPrompt(source), { deliverAs: 'followUp', triggerTurn: true });
      return;
    }
    throw new Error('No runtime message API is available for richer HTML generation.');
  }

  async function runGeminiRichExport(source) {
    const { stdout } = await execFileAsync(
      'gemini',
      ['--prompt', buildRichHtmlPrompt(source), '--output-format', 'text'],
      {
        timeout: 120000,
        maxBuffer: 8 * 1024 * 1024,
      }
    );

    const output = String(stdout || '').trim();
    if (!output) {
      throw new Error('Gemini CLI returned no output.');
    }

    const html = extractHtmlDocument(output);
    if (!html) {
      throw new Error('Gemini CLI did not return HTML output.');
    }

    return html;
  }

  async function chooseCommandExportMode(ctx) {
    if (!ctx || !ctx.ui || typeof ctx.ui.select !== 'function') {
      return 'local';
    }

    const geminiAvailable = await isGeminiCliAvailable();
    const options = [
      { label: 'Designed HTML with Gemini CLI', value: 'rich-gemini' },
      { label: 'Designed HTML with current Pi model', value: 'rich-pi' },
      { label: 'Quick local HTML', value: 'local' },
    ];
    if (!geminiAvailable) {
      options.shift();
    }

    try {
      const result = await ctx.ui.select('Choose HTML render mode', options);
      return normalizeChoice(result, options) || 'local';
    } catch (_) {
      return 'local';
    }
  }

  async function handleChoice(choice, ctx, source) {
    if (choice === 'never') {
      await setOfferMode('never');
      await notify(ctx, 'htmlify prompting disabled for this session.', 'info');
      return;
    }
    if (choice === 'inline' || !choice) return;
    if (choice === 'local') {
      await exportLocalHtml(ctx, source, 'local');
      return;
    }
    if (choice === 'rich') {
      await queueRichExport(source, ctx, 'pi');
      return;
    }
    if (choice === 'rich-gemini') {
      await queueRichExport(source, ctx, 'gemini');
      return;
    }
    if (choice === 'rich-pi') {
      await queueRichExport(source, ctx, 'pi');
    }
  }

  async function maybeHandlePendingRichExport(event, ctx) {
    if (!state.pendingRichExport) return false;
    const info = extractMessageInfo(event);
    if (!info) return false;

    const htmlDocument = extractHtmlDocument(info.text);
    if (htmlDocument) {
      try {
        await exportRichHtmlResult(ctx, state.pendingRichExport.source, htmlDocument);
      } catch (error) {
        await notify(
          ctx,
          `Richer HTML pass was unsafe or invalid: ${error && error.message ? error.message : String(error)}. Wrote a fallback HTML export instead. [${PRODUCT_NAME} ${EXTENSION_VERSION}]`,
          'warning'
        );
        await exportLocalHtml(ctx, state.pendingRichExport.source, 'llm-enhanced-fallback');
      }
    } else {
      await exportLocalHtml(
        ctx,
        {
          ...state.pendingRichExport.source,
          text: info.text,
        },
        'llm-enhanced-fallback'
      );
      await notify(ctx, 'Richer HTML pass returned plain text; wrote a fallback HTML export instead.', 'warning');
    }
    state.pendingRichExport = null;
    return true;
  }

  async function handleAssistantMessage(event, ctx) {
    if (await maybeHandlePendingRichExport(event, ctx)) return;

    const info = extractMessageInfo(event);
    if (!info) return;

    const source = buildSourceRecord(info.text);
    const signature = source.id;
    if (signature === state.lastPromptedSignature) return;

    await rememberEligibleSource(source);

    if (!isLongAnswer(info.text, state.config)) return;

    state.lastPromptedSignature = signature;
    // Avoid notifying from message_end: in OMP this can replace the just-finished assistant text.
    // The answer is already captured; /html-last remains available when the user wants the export.
  }

  async function exportLatestFromCommand(args, ctx) {
    if (!state.lastEligible || !state.lastEligible.text) {
      try {
        const branch =
          ctx && ctx.sessionManager && typeof ctx.sessionManager.getBranch === 'function'
            ? ctx.sessionManager.getBranch()
            : [];
        hydrateLastEligibleFromBranch(branch);
      } catch (_) {
        // Ignore branch hydration failures here; warning below handles the miss.
      }
    }

    if (!state.lastEligible || !state.lastEligible.text) {
      notify(
        ctx,
        `No eligible assistant answer has been captured yet in this session. Ask for a long answer first, then run /html-last or /htmlify. [${PRODUCT_NAME} ${EXTENSION_VERSION}]`,
        'warning'
      );
      return;
    }

    const forcedMode = resolveForcedExportMode(args);
    let mode = forcedMode || 'local';
    if (mode === 'choose') {
      mode = hasSelectableUi(ctx) ? await chooseCommandExportMode(ctx) : 'local';
    }

    if (mode === 'rich-gemini') {
      await queueRichExport(state.lastEligible, ctx, 'gemini');
      return;
    }
    if (mode === 'rich-pi') {
      await queueRichExport(state.lastEligible, ctx, 'pi');
      return;
    }

    await exportLocalHtml(ctx, state.lastEligible, 'local');
  }

  async function readCommentBundle(args) {
    const raw = typeof args === 'string' ? args.trim() : parseArgs(args).join(' ').trim();
    if (!raw) throw new Error('Pass a comments JSON file path or pasted JSON after /html-comments.');
    if (/^\{[\s\S]*\}$/.test(raw)) return JSON.parse(raw);
    const filePath = path.resolve(raw);
    const text = await fs.readFile(filePath, 'utf8');
    return JSON.parse(text);
  }

  async function importCommentsFromCommand(args, ctx) {
    if (!state.lastEligible || !state.lastEligible.text) {
      try {
        const branch =
          ctx && ctx.sessionManager && typeof ctx.sessionManager.getBranch === 'function'
            ? ctx.sessionManager.getBranch()
            : [];
        hydrateLastEligibleFromBranch(branch);
      } catch (_) {
        // Warning below handles the miss.
      }
    }
    const expectedSourceId = state.lastEligible && state.lastEligible.id;
    const bundle = validateCommentBundle(await readCommentBundle(args), expectedSourceId);
    const prompt = buildCommentsPrompt(bundle);
    await appendCustomEntry(COMMENT_ENTRY_TYPE, { ...bundle, importedAt: Date.now() });
    if (typeof pi.sendUserMessage === 'function') {
      await pi.sendUserMessage(prompt, { deliverAs: 'followUp' });
      notify(
        ctx,
        `Queued ${bundle.comments.length} HTML comment${bundle.comments.length === 1 ? '' : 's'} for the agent. [${PRODUCT_NAME} ${EXTENSION_VERSION}]`,
        'info'
      );
      return;
    }
    if (typeof pi.sendMessage === 'function') {
      await pi.sendMessage(prompt, { deliverAs: 'followUp', triggerTurn: true });
      notify(
        ctx,
        `Queued ${bundle.comments.length} HTML comment${bundle.comments.length === 1 ? '' : 's'} for the agent. [${PRODUCT_NAME} ${EXTENSION_VERSION}]`,
        'info'
      );
      return;
    }
    notify(ctx, prompt, 'info');
  }

  if (typeof pi.setLabel === 'function') {
    try {
      pi.setLabel(`${PRODUCT_NAME} ${EXTENSION_VERSION}`);
    } catch (_) {
      // Some hosts reject action methods during extension loading.
    }
  }

  const restoreHandler = async (_event, ctx) => {
    await restoreSessionState(ctx);
  };

  if (typeof pi.on === 'function') {
    pi.on('session_start', restoreHandler);
    pi.on('session_branch', restoreHandler);
    pi.on('session_tree', restoreHandler);
    pi.on('input', async (event, ctx) => {
      const parsedInput = parseHtmlCommandInput(event && event.text);
      if (!parsedInput) return undefined;

      try {
        if (parsedInput.command === 'version') {
          notify(ctx, `${PRODUCT_NAME} ${EXTENSION_VERSION}`, 'info');
        } else if (parsedInput.command === 'comments') {
          await importCommentsFromCommand(parsedInput.args, ctx);
        } else {
          await exportLatestFromCommand(parsedInput.args, ctx);
        }
      } catch (error) {
        notifyCommandError(ctx, error);
      }

      return { handled: true, action: 'handled' };
    });
    pi.on('message_end', async (event, ctx) => {
      try {
        await handleAssistantMessage(event, ctx);
      } catch (error) {
        await notify(
          ctx,
          `${PRODUCT_NAME} extension error: ${error && error.message ? error.message : String(error)}`,
          'error'
        );
      }
    });
  }

  if (typeof pi.registerCommand === 'function') {
    const exportCommand = {
      description:
        'Export the latest eligible assistant answer as HTML. Use `choose`, `gemini`, `pi`, or `local` to force a render path.',
      handler: (args, ctx) => {
        void exportLatestFromCommand(args, ctx).catch((error) => {
          notifyCommandError(ctx, error);
        });
      },
    };

    pi.registerCommand('html-last', {
      ...exportCommand,
    });
    pi.registerCommand('htmlify', { ...exportCommand });
    pi.registerCommand('htmlify-last', { ...exportCommand });

    const commentsCommand = {
      description: 'Import downloaded HTML comments JSON and send the review prompt back to the agent.',
      handler: (args, ctx) => {
        void importCommentsFromCommand(args, ctx).catch((error) => {
          notifyCommandError(ctx, error);
        });
      },
    };

    pi.registerCommand('html-comments', { ...commentsCommand });
    pi.registerCommand('htmlify-comments', { ...commentsCommand });

    const versionCommand = {
      description: 'Show the loaded htmlify extension version.',
      handler: (_args, ctx) => {
        notify(ctx, `${PRODUCT_NAME} ${EXTENSION_VERSION}`, 'info');
      },
    };

    pi.registerCommand('html-last-version', { ...versionCommand });
    pi.registerCommand('htmlify-version', { ...versionCommand });
  }
};
