const { escapeHtml } = require('./text');

/**
 * @param {any} line
 * @returns {boolean}
 */
function isSeparatorRow(line) {
  return /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line || '');
}

/**
 * @param {any} line
 * @returns {string[]}
 */
function splitTableRow(line) {
  return String(line || '')
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

/**
 * @param {any} raw
 * @returns {string}
 */
function formatInline(raw) {
  let text = escapeHtml(raw);
  text = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>'
  );
  text = text.replace(
    /(?<!href=")(?<!">)(https?:\/\/[^\s<)]+)/g,
    '<a href="$1" target="_blank" rel="noreferrer noopener">$1</a>'
  );
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(^|\W)\*([^*]+)\*(?=\W|$)/g, '$1<em>$2</em>');
  return text;
}

/**
 * @param {string[]} lines
 * @param {number} start
 * @param {(line: string, index: number) => boolean} predicate
 * @returns {{ collected: string[], nextIndex: number }}
 */
function collectUntil(lines, start, predicate) {
  const collected = [];
  let index = start;
  while (index < lines.length && predicate(lines[index], index)) {
    collected.push(lines[index]);
    index += 1;
  }
  return { collected, nextIndex: index };
}

/**
 * @param {any} text
 * @returns {string}
 */
function renderMarkdownish(text) {
  const lines = String(text || '')
    .replace(/\r/g, '')
    .split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const codeLines = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push(
        `<pre class="code-block"><div class="code-meta">${escapeHtml(language || 'code')}</div><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`
      );
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = Math.min(6, headingMatch[1].length + 1);
      blocks.push(`<h${level}>${formatInline(headingMatch[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const { collected, nextIndex } = collectUntil(lines, i, (current) => /^>\s?/.test((current || '').trim()));
      const inner = collected.map((current) => current.trim().replace(/^>\s?/, '')).join(' ');
      blocks.push(
        `<aside class="callout"><div class="callout-label">Callout</div><p>${formatInline(inner)}</p></aside>`
      );
      i = nextIndex;
      continue;
    }

    const nextLine = lines[i + 1] || '';
    if (trimmed.includes('|') && isSeparatorRow(nextLine)) {
      const header = splitTableRow(trimmed);
      i += 2;
      const body = [];
      while (i < lines.length && (lines[i] || '').trim().includes('|')) {
        body.push(splitTableRow(lines[i]));
        i += 1;
      }
      const thead = `<thead><tr>${header.map((cell) => `<th>${formatInline(cell)}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${formatInline(cell)}</td>`).join('')}</tr>`).join('')}</tbody>`;
      blocks.push(`<div class="table-wrap"><table>${thead}${tbody}</table></div>`);
      continue;
    }

    if (/^(?:[-*]|\d+\.)\s+/.test(trimmed)) {
      const ordered = /^\d+\.\s+/.test(trimmed);
      const pattern = ordered ? /^\d+\.\s+/ : /^(?:[-*])\s+/;
      const { collected, nextIndex } = collectUntil(lines, i, (current) => pattern.test((current || '').trim()));
      const tag = ordered ? 'ol' : 'ul';
      blocks.push(
        `<${tag}>${collected.map((current) => `<li>${formatInline(current.trim().replace(pattern, ''))}</li>`).join('')}</${tag}>`
      );
      i = nextIndex;
      continue;
    }

    const { collected, nextIndex } = collectUntil(lines, i, (current) => {
      const currentTrimmed = (current || '').trim();
      if (!currentTrimmed) return false;
      if (currentTrimmed.startsWith('```')) return false;
      if (/^(#{1,6})\s+/.test(currentTrimmed)) return false;
      if (/^(?:[-*]|\d+\.)\s+/.test(currentTrimmed)) return false;
      if (/^>\s?/.test(currentTrimmed)) return false;
      return true;
    });

    const paragraph = collected.map((current) => current.trim()).join(' ');
    blocks.push(`<p>${formatInline(paragraph)}</p>`);
    i = nextIndex;
  }

  return blocks.join('\n');
}

module.exports = {
  isSeparatorRow,
  splitTableRow,
  formatInline,
  collectUntil,
  renderMarkdownish,
};
