#!/usr/bin/env node

const path = require('path');
const htmlify = require('../index.js');

const { renderMarkdownish, writeHtmlArtifact } = htmlify._internals;

/** @returns {Promise<string>} */
function readStdin() {
  return new Promise((resolve, reject) => {
    /** @type {Buffer[]} */
    const chunks = [];
    process.stdin.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    process.stdin.on('error', reject);
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

/**
 * @param {any} text
 * @returns {string}
 */
function titleFrom(text) {
  const first = String(text || '')
    .split(/\r?\n/)
    .find((line) => line.trim());
  return first
    ? first
        .trim()
        .replace(/^#+\s*/, '')
        .slice(0, 120)
    : 'Claude Code answer';
}

async function main() {
  const inputText = await readStdin();
  let input;
  try {
    input = JSON.parse(inputText || '{}');
  } catch (_) {
    return;
  }

  const message = String(input.last_assistant_message || '').trim();
  const minChars = Number.parseInt(process.env.HTMLIFY_MIN_CHARS || '2500', 10);
  if (!message || message.length < minChars) return;

  if (process.env.HTMLIFY_EXPORT_ROOT) {
    process.env.HTMLIFY_EXPORT_ROOT = path.resolve(process.env.HTMLIFY_EXPORT_ROOT);
  }

  const filePath = await writeHtmlArtifact({
    title: titleFrom(message),
    bodyHtml: renderMarkdownish(message),
    sourceText: message,
    mode: 'claude-code-stop-hook',
  });

  process.stdout.write(
    JSON.stringify({
      systemMessage: `htmlify wrote a long-answer HTML artifact: ${filePath}`,
      suppressOutput: false,
    })
  );
}

main().catch((error) => {
  process.stderr.write(`htmlify hook failed: ${error && error.message ? error.message : String(error)}\n`);
  process.exitCode = 0;
});
