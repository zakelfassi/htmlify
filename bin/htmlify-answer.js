#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const htmlify = require('../index.js');

const {
  renderMarkdownish,
  writeHtmlArtifact,
} = htmlify._internals;

function usage() {
  return [
    'Usage: htmlify-answer [--title "Title"] [--out-dir DIR] [--mode MODE] [--input FILE]',
    '',
    'Reads text from stdin by default and writes a self-contained HTML artifact.',
    'Prints the written file path to stdout.',
  ].join('\n');
}

function parseArgs(argv) {
  const options = {
    title: '',
    outDir: '',
    mode: 'agent-hook',
    input: '',
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--title') {
      options.title = argv[++index] || '';
    } else if (arg === '--out-dir') {
      options.outDir = argv[++index] || '';
    } else if (arg === '--mode') {
      options.mode = argv[++index] || options.mode;
    } else if (arg === '--input') {
      options.input = argv[++index] || '';
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function readInput(options) {
  if (options.input) {
    return fs.readFile(path.resolve(options.input), 'utf8');
  }
  return readStdin();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  if (options.outDir) {
    process.env.HTMLIFY_EXPORT_ROOT = path.resolve(options.outDir);
  }

  const sourceText = (await readInput(options)).trim();
  if (!sourceText) {
    throw new Error('No input text provided.');
  }

  const title = options.title || sourceText.split(/\r?\n/).find((line) => line.trim()).trim().slice(0, 120) || 'htmlify export';
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
  process.exitCode = 1;
});
