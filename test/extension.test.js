const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const packageJson = require('../package.json');
const extension = require('../index.js');
const internals = extension._internals;

/**
 * @param {string} body
 * @param {string} [head]
 */
function richDocument(body, head = '<meta charset="utf-8" /><style>body{font-family:system-ui}</style>') {
  return `<!DOCTYPE html>
<html lang="en">
<head>${head}</head>
<body>${body}</body>
</html>`;
}

/**
 * @param {(tempDir: string) => Promise<any>} fn
 */
async function withTempExportRoot(fn) {
  const previous = process.env.HTMLIFY_EXPORT_ROOT;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'htmlify-test-'));
  process.env.HTMLIFY_EXPORT_ROOT = tempDir;
  try {
    return await fn(tempDir);
  } finally {
    if (previous === undefined) {
      delete process.env.HTMLIFY_EXPORT_ROOT;
    } else {
      process.env.HTMLIFY_EXPORT_ROOT = previous;
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

/**
 * @param {string} scriptPath
 * @param {string[]} args
 * @param {string} input
 * @param {Record<string, string>} [env]
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string }>}
 */
function runNodeScript(scriptPath, args, input, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...(args || [])], {
      cwd: repoRoot,
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
    child.stdin.end(input || '');
  });
}

test('package metadata preserves npm Pi and OMP entry contracts', () => {
  assert.equal(packageJson.private, false);
  assert.equal(packageJson.type, 'commonjs');
  assert.equal(packageJson.main, 'index.js');
  assert.equal(packageJson.engines.node, '>=20');
  assert.equal(packageJson.pi.extensions[0], './index.js');
  assert.equal(packageJson.omp.extensions[0], './index.js');
  assert.ok(packageJson.keywords.includes('pi-package'));
  assert.ok(packageJson.keywords.includes('pi-extension'));
  assert.ok(packageJson.keywords.includes('agentskills'));
  assert.deepEqual(packageJson.files, [
    'index.js',
    'src/',
    'bin/',
    'hooks/',
    'skills/',
    '.claude-plugin/',
    'assets/',
    'README.md',
  ]);
  assert.ok(packageJson.scripts.test.includes('node --test'));

  for (const entry of [packageJson.main, packageJson.pi.extensions[0], packageJson.omp.extensions[0]]) {
    const resolved = path.resolve(repoRoot, entry);
    assert.equal(resolved, path.join(repoRoot, 'index.js'));
  }
});

test('manifest entries load the same extension factory shape', () => {
  const byMain = require(path.join(repoRoot, packageJson.main));
  const byPi = require(path.resolve(repoRoot, packageJson.pi.extensions[0]));
  const byOmp = require(path.resolve(repoRoot, packageJson.omp.extensions[0]));

  assert.equal(typeof byMain, 'function');
  assert.equal(byMain, byPi);
  assert.equal(byMain, byOmp);
  assert.equal(typeof byMain._internals.validateRichHtmlDocument, 'function');
});

test('extension registers commands/events and handles long assistant messages', async () => {
  assert.doesNotThrow(() => extension({}));
  assert.doesNotThrow(() =>
    extension({
      setLabel: () => {
        throw new Error('not initialized');
      },
    })
  );

  /** @type {string[]} */
  const labels = [];
  /** @type {Map<string, any>} */
  const events = new Map();
  /** @type {Map<string, any>} */
  const commands = new Map();
  /** @type {Array<{ type: string, data: any }>} */
  const entries = [];
  /** @type {string[]} */
  const notifications = [];
  extension({
    setLabel: (label) => labels.push(label),
    on: (eventName, handler) => events.set(eventName, handler),
    registerCommand: (name, definition) => commands.set(name, definition),
    appendEntry: async (type, data) => entries.push({ type, data }),
  });

  assert.match(labels[0], /^htmlify /);
  assert.equal(typeof events.get('session_start'), 'function');
  assert.equal(typeof events.get('session_branch'), 'function');
  assert.equal(typeof events.get('session_tree'), 'function');
  assert.equal(typeof events.get('message_end'), 'function');
  assert.equal(typeof events.get('input'), 'function');
  assert.equal(typeof commands.get('html-last').handler, 'function');
  assert.equal(typeof commands.get('htmlify').handler, 'function');
  assert.equal(typeof commands.get('html-last-version').handler, 'function');
  assert.equal(typeof commands.get('htmlify-version').handler, 'function');
  assert.equal(typeof commands.get('html-comments').handler, 'function');
  assert.equal(typeof commands.get('htmlify-comments').handler, 'function');

  const inputResult = await events.get('input')(
    { text: '/html-last' },
    {
      ui: { notify: (/** @type {string} */ message) => notifications.push(message) },
    }
  );
  assert.deepEqual(inputResult, { handled: true, action: 'handled' });

  const commandResult = commands.get('html-last').handler('', {
    ui: { notify: (/** @type {string} */ message) => notifications.push(message) },
  });
  assert.equal(commandResult, undefined);
  await Promise.resolve();
  assert.equal(
    notifications.some((message) => message.includes('No eligible assistant answer')),
    true
  );

  const longText = `# Captured Answer\n\n${'This answer is long enough to trigger capture. '.repeat(80)}`;
  await events.get('message_end')(
    { message: { role: 'assistant', text: longText } },
    {
      hasUI: true,
      ui: { notify: (/** @type {string} */ message) => notifications.push(message) },
    }
  );

  const sourceEntry = entries.find((entry) => entry.type === 'html-long-answer-source');
  assert.ok(sourceEntry);
  assert.equal(typeof sourceEntry.data.id, 'string');
  assert.equal(sourceEntry.data.text, undefined);
  assert.equal(sourceEntry.data.stats.characters, longText.trim().length);
  assert.equal(
    notifications.some((message) => message.includes('Long answer captured for HTML export')),
    false
  );
});

test('/html-last choose falls back to local export when chooser is unavailable', async () => {
  await withTempExportRoot(async () => {
    const previousSkipOpen = process.env.HTMLIFY_SKIP_OPEN;
    process.env.HTMLIFY_SKIP_OPEN = '1';

    try {
      /** @type {Map<string, any>} */
      const events = new Map();
      /** @type {Array<{ type: string, data: any }>} */
      const entries = [];
      /** @type {string[]} */
      const notifications = [];
      /** @type {string[]} */
      const sentMessages = [];
      extension({
        on: (eventName, handler) => events.set(eventName, handler),
        appendEntry: async (type, data) => entries.push({ type, data }),
        sendUserMessage: async (message) => sentMessages.push(message),
      });

      const longText = `# Captured Answer\n\n${'This answer is long enough to trigger capture. '.repeat(80)}`;
      await events.get('message_end')({ message: { role: 'assistant', text: longText } }, { hasUI: true, ui: {} });
      await events.get('input')(
        { text: '/html-last choose' },
        {
          hasUI: true,
          ui: {
            select: () => {
              throw new Error('chooser unavailable');
            },
            notify: (/** @type {string} */ message) => notifications.push(message),
          },
        }
      );

      assert.equal(sentMessages.length, 0);
      assert.equal(
        entries.some((entry) => entry.type === 'html-long-answer-export' && entry.data.mode === 'local'),
        true
      );
      assert.equal(
        notifications.some((message) => message.includes('HTML export written')),
        true
      );
    } finally {
      if (previousSkipOpen === undefined) {
        delete process.env.HTMLIFY_SKIP_OPEN;
      } else {
        process.env.HTMLIFY_SKIP_OPEN = previousSkipOpen;
      }
    }
  });
});

test('local export preserves shell and representative markdown-ish rendering', async () => {
  await withTempExportRoot(async () => {
    const sourceText = [
      '# Local Export Title',
      '',
      'Paragraph with https://example.com and `inlineCode`.',
      '',
      '- first item',
      '- second item',
      '',
      '| Name | Value |',
      '|---|---|',
      '| alpha | beta |',
    ].join('\n');
    const bodyHtml = internals.renderMarkdownish(sourceText);
    const filePath = await internals.writeHtmlArtifact({
      title: 'Local Export Title',
      bodyHtml,
      sourceText,
      mode: 'local',
    });
    const html = await fs.readFile(filePath, 'utf8');

    assert.match(html, /<div class="eyebrow">htmlify export<\/div>/);
    assert.match(html, /<strong>Mode<\/strong><br \/>local/);
    assert.match(html, /href="https:\/\/example\.com"/);
    assert.match(html, /<h2 data-commentable="true" data-block-id="b-1">Local Export Title<\/h2>/);
    assert.match(html, /<code>inlineCode<\/code>/);
    assert.match(
      html,
      /<ul><li data-commentable="true" data-block-id="b-3">first item<\/li><li data-commentable="true" data-block-id="b-4">second item<\/li><\/ul>/
    );
    assert.match(html, /<table data-commentable="true" data-block-id="b-5">/);
    assert.equal((html.match(/<script/gi) || []).length, 1);
    assert.match(html, /htmlify trusted annotation layer/);
    assert.match(html, /data-commentable="true" data-block-id="b-1"/);
    assert.match(html, /id="hla-add-comment"/);
  });
});

test('rich export writes one standalone document instead of nesting it in the local shell', async () => {
  await withTempExportRoot(async () => {
    const richHtml = richDocument('<main><h1>Designed Export</h1><p>Safe body.</p></main>');
    const filePath = await internals.writeRichHtmlArtifact({
      title: 'Designed Export',
      htmlText: richHtml,
    });
    const html = await fs.readFile(filePath, 'utf8');

    assert.equal((html.match(/<!DOCTYPE html/gi) || []).length, 1);
    assert.equal((html.match(/<html\b/gi) || []).length, 1);
    assert.equal((html.match(/<body\b/gi) || []).length, 1);
    assert.doesNotMatch(html, /<article class="content">[\s\S]*<!DOCTYPE html/i);
    assert.doesNotMatch(html, /<div class="eyebrow">htmlify export<\/div>/);
    assert.match(html, /<h1 data-commentable="true" data-block-id="b-1">Designed Export<\/h1>/);
  });
});

test('rich export injects trusted annotation layer after validation', async () => {
  await withTempExportRoot(async () => {
    const richHtml = richDocument('<main><h1>Designed Export</h1><p>Safe body.</p></main>');
    const filePath = await internals.writeRichHtmlArtifact({
      title: 'Designed Export',
      htmlText: richHtml,
      sourceId: 'abc123',
    });
    const html = await fs.readFile(filePath, 'utf8');

    assert.match(html, /htmlify trusted annotation layer/);
    assert.match(html, /sourceId: "abc123"/);
    assert.match(html, /id="hla-download-json"/);
    assert.match(html, /<p data-commentable="true" data-block-id="b-2">Safe body\.<\/p>/);
    assert.equal((html.match(/<script/gi) || []).length, 1);
  });
});

test('rich validation rejects dangerous or over-large HTML', () => {
  const invalidCases = [
    richDocument('<script>alert(1)</script>'),
    richDocument('<main onclick="alert(1)">bad</main>'),
    richDocument('<a href="javascript:alert(1)">bad</a>'),
    richDocument('<img src="https://example.com/a.png" alt="bad" />'),
    richDocument('<main style="background:url(https://example.com/a.png)">bad</main>'),
    richDocument('<img src="data:image/png;base64,abc" srcset="https://example.com/a.png 1x" alt="bad" />'),
    richDocument('<svg><image href="https://example.com/a.png" /></svg>'),
    richDocument('<svg><use xlink:href="https://example.com/s.svg#icon" /></svg>'),
    richDocument('<style>@import "https://example.com/x.css"; body { color: red; }</style><main>bad</main>'),
    richDocument('<p>refresh</p>', '<meta http-equiv="refresh" content="0; url=https://example.com" />'),
    '<!DOCTYPE html><body>missing html wrapper</body>',
    richDocument('x'.repeat(513 * 1024)),
  ];

  for (const html of invalidCases) {
    assert.throws(
      () => internals.validateRichHtmlDocument(html),
      /Rich HTML output|blocked|event-handler|javascript|external|meta refresh|exceeded|standalone/
    );
  }
});

test('open command resolution refuses missing launchers', async () => {
  await withTempExportRoot(async (tempDir) => {
    const previousPath = process.env.PATH;
    const launcher = path.join(tempDir, 'fake-open');
    await fs.writeFile(launcher, '#!/bin/sh\nexit 0\n', 'utf8');
    await fs.chmod(launcher, 0o755);
    process.env.PATH = tempDir;

    try {
      assert.equal(await internals.resolveOpenCommand('missing-open'), null);
      assert.equal(await internals.resolveOpenCommand('fake-open'), launcher);
      assert.equal(await internals.resolveOpenCommand(launcher), launcher);
      assert.equal(await internals.resolveOpenCommand(path.join(tempDir, 'not-executable')), null);
    } finally {
      if (previousPath === undefined) {
        delete process.env.PATH;
      } else {
        process.env.PATH = previousPath;
      }
    }
  });
});

test('rich extraction and command mode parsing are deterministic', () => {
  const fenced = 'prefix\n```html\n<html><body><p>ok</p></body></html>\n```\nsuffix';
  assert.equal(internals.extractHtmlDocument(fenced), '<html><body><p>ok</p></body></html>');
  assert.equal(internals.extractHtmlDocument('plain text'), null);

  assert.deepEqual(internals.parseArgs({ args: ['gemini'] }), ['gemini']);
  assert.equal(internals.resolveForcedExportMode('gemini'), 'rich-gemini');
  assert.equal(internals.resolveForcedExportMode(['pi']), 'rich-pi');
  assert.equal(internals.resolveForcedExportMode({ args: ['quick'] }), 'local');
  assert.equal(internals.resolveForcedExportMode('choose'), 'choose');
  assert.equal(internals.resolveForcedExportMode('choices'), 'choose');
  assert.equal(internals.hasSelectableUi({ ui: { select: () => 'local' } }), true);
  assert.equal(internals.hasSelectableUi({ hasUI: true, ui: {} }), false);
  assert.deepEqual(internals.parseHtmlLastInput('/html-last quick'), { command: 'export', args: 'quick' });
  assert.deepEqual(internals.parseHtmlLastInput(' /html-last-version '), { command: 'version', args: '' });
  assert.deepEqual(internals.parseHtmlLastInput(' /htmlify-version '), { command: 'version', args: '' });
  assert.deepEqual(internals.parseHtmlLastInput('/htmlify gemini'), { command: 'export', args: 'gemini' });
  assert.equal(internals.parseHtmlLastInput('/html-lastly'), null);
  assert.deepEqual(internals.parseHtmlLastInput('/html-comments comments.json'), {
    command: 'comments',
    args: 'comments.json',
  });
  assert.deepEqual(internals.parseHtmlLastInput('/htmlify-comments comments.json'), {
    command: 'comments',
    args: 'comments.json',
  });
  assert.equal(internals.resolveForcedExportMode('designed'), 'rich-pi');
  assert.equal(internals.resolveForcedExportMode(''), null);
});

test('comment bundles validate and produce deterministic agent prompt', () => {
  const bundle = internals.validateCommentBundle(
    {
      version: 1,
      sourceId: 'source-a',
      title: 'Reviewed Export',
      exportUrl: 'file:///tmp/export.html',
      comments: [
        {
          id: 'c1',
          blockId: 'b-2',
          selectedText: 'selected claim',
          prefix: 'before',
          suffix: 'after',
          comment: 'Please tighten this.',
          createdAt: '2026-05-05T00:00:00.000Z',
        },
      ],
    },
    'source-a'
  );

  const prompt = internals.buildCommentsPrompt(bundle);
  assert.match(prompt, /I reviewed the HTML export/);
  assert.match(prompt, /Source ID: source-a/);
  assert.match(prompt, /> selected claim/);
  assert.match(prompt, /Please tighten this\./);
  assert.throws(
    () => internals.validateCommentBundle({ version: 1, sourceId: 'other', comments: [] }, 'source-a'),
    /does not match/
  );
});

test('/html-comments accepts pasted JSON without collapsing comment text', async () => {
  /** @type {Map<string, any>} */
  const events = new Map();
  /** @type {string[]} */
  const sentMessages = [];
  /** @type {string[]} */
  const notifications = [];
  extension({
    on: (eventName, handler) => events.set(eventName, handler),
    sendUserMessage: async (message) => sentMessages.push(message),
    appendEntry: async () => {},
  });

  const bundle = {
    version: 1,
    sourceId: 'source-a',
    title: 'Reviewed Export',
    comments: [
      {
        selectedText: 'selected claim',
        prefix: 'before',
        suffix: 'after',
        comment: 'Keep  two   spaces\nand this newline.',
      },
    ],
  };

  const result = await events.get('input')(
    { text: `/html-comments ${JSON.stringify(bundle, null, 2)}` },
    {
      ui: { notify: (/** @type {string} */ message) => notifications.push(message) },
    }
  );

  assert.deepEqual(result, { handled: true, action: 'handled' });
  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0], /Keep {2}two {3}spaces\nand this newline\./);
  assert.equal(
    notifications.some((message) => message.includes('Queued 1 HTML comment')),
    true
  );
});

test('htmlify-answer CLI writes a self-contained export from stdin', async () => {
  await withTempExportRoot(async (tempDir) => {
    const result = await runNodeScript(
      path.join(repoRoot, 'bin/htmlify-answer.js'),
      ['--title', 'CLI Export', '--mode', 'test-cli'],
      '# CLI Export\n\nThis is a long-enough direct CLI export for agent hooks.',
      { HTMLIFY_EXPORT_ROOT: tempDir }
    );

    assert.equal(result.code, 0, result.stderr);
    const filePath = result.stdout.trim();
    assert.equal(path.dirname(filePath), tempDir);
    const html = await fs.readFile(filePath, 'utf8');
    assert.match(html, /<!DOCTYPE html>/);
    assert.match(html, /CLI Export/);
    assert.match(html, /htmlify trusted annotation layer/);
  });
});

test('Claude Code Stop hook exports only answers above threshold', async () => {
  await withTempExportRoot(async (tempDir) => {
    const shortResult = await runNodeScript(
      path.join(repoRoot, 'hooks/claude-code-stop-htmlify.js'),
      [],
      JSON.stringify({ hook_event_name: 'Stop', last_assistant_message: 'short' }),
      { HTMLIFY_EXPORT_ROOT: tempDir, HTMLIFY_MIN_CHARS: '40' }
    );
    assert.equal(shortResult.code, 0, shortResult.stderr);
    assert.equal(shortResult.stdout, '');

    const longText = '# Hook Export\n\n' + 'This answer should become an HTML artifact. '.repeat(6);
    const longResult = await runNodeScript(
      path.join(repoRoot, 'hooks/claude-code-stop-htmlify.js'),
      [],
      JSON.stringify({ hook_event_name: 'Stop', last_assistant_message: longText }),
      { HTMLIFY_EXPORT_ROOT: tempDir, HTMLIFY_MIN_CHARS: '40' }
    );

    assert.equal(longResult.code, 0, longResult.stderr);
    const output = JSON.parse(longResult.stdout);
    assert.match(output.systemMessage, /htmlify wrote a long-answer HTML artifact:/);
    const filePath = output.systemMessage.split(': ').pop();
    const html = await fs.readFile(filePath, 'utf8');
    assert.match(html, /Hook Export/);
    assert.match(html, /claude-code-stop-hook/);
  });
});
