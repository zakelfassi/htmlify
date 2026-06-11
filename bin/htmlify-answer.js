#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const htmlify = require('../index.js');

const { renderMarkdownish, writeHtmlArtifact, collectRichHtmlIssues, collectDeckIssues, detectProfile } =
  htmlify._internals;

const USAGE_EXIT_CODE = 2;

function usage() {
  return [
    'Usage:',
    '  htmlify-answer [--title "Title"] [--out-dir DIR] [--mode MODE] [--input FILE]',
    '  htmlify-answer --validate FILE... [--profile rich|app|deck|auto] [--format text|json] [--quiet]',
    '',
    'Export mode reads text from stdin by default and writes a self-contained HTML',
    'artifact, printing the written file path to stdout.',
    '',
    'Validate mode checks artifacts against a safety/structure profile:',
    '  rich  no scripts at all (model-generated documents)',
    '  app   inline scripts allowed for interactive artifacts; external scripts banned',
    '  deck  app rules plus the deckify contract (slides, keyboard nav, speaker notes)',
    '  auto  detect per file from the document shape (default)',
    '',
    'Exit codes: 0 valid, 1 validation errors, 2 usage or I/O error.',
  ].join('\n');
}

/**
 * @typedef {{
 *   title: string, outDir: string, mode: string, input: string, help: boolean,
 *   validate: string[], profile: string, format: string, quiet: boolean,
 *   exportFlagsUsed: boolean,
 * }} CliOptions
 */

/**
 * @param {string[]} argv
 * @returns {CliOptions}
 */
function parseArgs(argv) {
  const options = {
    title: '',
    outDir: '',
    mode: 'agent-hook',
    input: '',
    help: false,
    validate: /** @type {string[]} */ ([]),
    profile: 'auto',
    format: 'text',
    quiet: false,
    exportFlagsUsed: false,
  };

  let validating = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--title') {
      options.title = argv[++index] || '';
      options.exportFlagsUsed = true;
    } else if (arg === '--out-dir') {
      options.outDir = argv[++index] || '';
      options.exportFlagsUsed = true;
    } else if (arg === '--mode') {
      options.mode = argv[++index] || options.mode;
      options.exportFlagsUsed = true;
    } else if (arg === '--input') {
      options.input = argv[++index] || '';
      options.exportFlagsUsed = true;
    } else if (arg === '--validate') {
      validating = true;
    } else if (arg === '--profile') {
      options.profile = argv[++index] || 'auto';
    } else if (arg === '--format') {
      options.format = argv[++index] || 'text';
    } else if (arg === '--quiet') {
      options.quiet = true;
    } else if (validating && !arg.startsWith('--')) {
      options.validate.push(arg);
    } else {
      throw usageError(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

/**
 * @param {string} message
 * @returns {Error & { usage?: boolean }}
 */
function usageError(message) {
  /** @type {Error & { usage?: boolean }} */
  const error = new Error(message);
  error.usage = true;
  return error;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * @param {{ input: string }} options
 * @returns {Promise<string>}
 */
async function readInput(options) {
  if (options.input) {
    return fs.readFile(path.resolve(options.input), 'utf8');
  }
  return readStdin();
}

/**
 * @param {CliOptions} options
 */
async function runValidate(options) {
  if (!['rich', 'app', 'deck', 'auto'].includes(options.profile)) {
    throw usageError(`Unknown profile: ${options.profile}. Use rich, app, deck, or auto.`);
  }
  if (!['text', 'json'].includes(options.format)) {
    throw usageError(`Unknown format: ${options.format}. Use text or json.`);
  }

  const reports = [];
  let failed = false;

  for (const file of options.validate) {
    const filePath = path.resolve(file);
    let html;
    try {
      html = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      throw usageError(`Cannot read ${file}: ${error && /** @type {any} */ (error).message}`);
    }

    const profile = options.profile === 'auto' ? detectProfile(html) : options.profile;
    const baseDir = path.dirname(filePath);
    /** @type {{ errors: {code: string, message: string}[], warnings: {code: string, message: string}[], stats?: object }} */
    const report =
      profile === 'deck'
        ? collectDeckIssues(html, { baseDir })
        : collectRichHtmlIssues(html, { allowInlineScript: profile === 'app', baseDir });

    const valid = report.errors.length === 0;
    if (!valid) failed = true;
    reports.push({
      file,
      profile,
      valid,
      errors: report.errors,
      warnings: report.warnings,
      stats: report.stats || {},
    });

    if (options.format === 'text') {
      for (const issue of report.errors) {
        process.stdout.write(`${file}: error ${issue.code}: ${issue.message}\n`);
      }
      if (!options.quiet) {
        for (const issue of report.warnings) {
          process.stdout.write(`${file}: warning ${issue.code}: ${issue.message}\n`);
        }
      }
      process.stdout.write(
        `${file}: ${valid ? 'valid' : 'INVALID'} — ${report.errors.length} error${report.errors.length === 1 ? '' : 's'}, ${report.warnings.length} warning${report.warnings.length === 1 ? '' : 's'} (profile: ${profile})\n`
      );
    }
  }

  if (options.format === 'json') {
    process.stdout.write(`${JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 2)}\n`);
  }

  if (failed) process.exitCode = 1;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  if (options.validate.length) {
    if (options.exportFlagsUsed) {
      throw usageError('--validate cannot be combined with export flags (--title, --out-dir, --mode, --input).');
    }
    await runValidate(options);
    return;
  }

  if (options.outDir) {
    process.env.HTMLIFY_EXPORT_ROOT = path.resolve(options.outDir);
  }

  const sourceText = (await readInput(options)).trim();
  if (!sourceText) {
    throw new Error('No input text provided.');
  }

  const title =
    options.title ||
    // sourceText is non-empty here, so a non-blank line always exists.
    /** @type {string} */ (sourceText.split(/\r?\n/).find((line) => line.trim())).trim().slice(0, 120) ||
    'htmlify export';
  const filePath = await writeHtmlArtifact({
    title,
    bodyHtml: renderMarkdownish(sourceText),
    sourceText,
    mode: options.mode,
  });

  process.stdout.write(`${filePath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error && error.message ? error.message : String(error)}\n`);
  process.exitCode = error && error.usage ? USAGE_EXIT_CODE : 1;
});
