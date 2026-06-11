const crypto = require('crypto');

function sha(input) {
  return crypto
    .createHash('sha1')
    .update(String(input || ''))
    .digest('hex');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(value) {
  const normalized = String(value || 'export')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return normalized || 'export';
}

function countParagraphs(text) {
  return String(text || '')
    .split(/\n\s*\n/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean).length;
}

function countLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0).length;
}

function wordCount(text) {
  const matches = String(text || '')
    .trim()
    .match(/\S+/g);
  return matches ? matches.length : 0;
}

module.exports = {
  sha,
  escapeHtml,
  slugify,
  countParagraphs,
  countLines,
  wordCount,
};
