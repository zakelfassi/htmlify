const { sha, countLines, countParagraphs } = require('../text');

function extractTextPart(part) {
  if (!part) return '';
  if (typeof part === 'string') return part;
  if (typeof part.text === 'string') return part.text;
  if (typeof part.content === 'string') return part.content;
  if (Array.isArray(part.parts)) return part.parts.map(extractTextPart).join('');
  if (Array.isArray(part.content)) return part.content.map(extractTextPart).join('');
  return '';
}

function normalizeRole(candidate) {
  if (!candidate) return null;
  const role = String(candidate).toLowerCase();
  if (role.includes('assistant') || role.includes('agent') || role.includes('model')) return 'assistant';
  if (role.includes('user')) return 'user';
  return role;
}

function extractMessageInfo(event) {
  const candidate =
    event && typeof event === 'object' ? event.message || event.entry || event.payload || event.data || event : null;
  if (!candidate || typeof candidate !== 'object') return null;

  const role = normalizeRole(candidate.role || candidate.author || candidate.kind || candidate.source);
  const id = candidate.id || candidate.messageId || candidate.entryId || null;
  const text =
    [
      typeof candidate.text === 'string' ? candidate.text : '',
      typeof candidate.content === 'string' ? candidate.content : '',
      Array.isArray(candidate.content) ? candidate.content.map(extractTextPart).join('') : '',
      Array.isArray(candidate.parts) ? candidate.parts.map(extractTextPart).join('') : '',
    ].find((value) => typeof value === 'string' && value.trim().length > 0) || '';

  if (!text.trim() || role !== 'assistant') return null;
  return {
    id: id || sha(text),
    role,
    text: text.trim(),
  };
}

function isLongAnswer(text, config) {
  const source = String(text || '').trim();
  if (!source) return false;
  return (
    source.length >= config.minChars ||
    countLines(source) >= config.minLines ||
    countParagraphs(source) >= config.minParagraphs
  );
}

function extractHtmlDocument(text) {
  const source = String(text || '').trim();
  if (!source) return null;

  const fenced = source.match(/```html\s*([\s\S]*?)```/i);
  if (fenced && fenced[1] && fenced[1].trim()) return fenced[1].trim();

  if (/<!DOCTYPE html/i.test(source) || /<html[\s>]/i.test(source) || /<body[\s>]/i.test(source)) {
    return source;
  }

  return null;
}

module.exports = {
  extractTextPart,
  normalizeRole,
  extractMessageInfo,
  isLongAnswer,
  extractHtmlDocument,
};
