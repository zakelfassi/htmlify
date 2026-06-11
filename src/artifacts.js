const fs = require('fs/promises');
const path = require('path');

const { DEFAULT_EXPORT_ROOT } = require('./constants');
const { sha, slugify, wordCount } = require('./text');
const { deriveExcerpt, buildOutlineHtml, buildLocalHtmlDocument } = require('./document');
const { addCommentableAttributes, injectAnnotationLayer } = require('./annotation');
const { validateRichHtmlDocument } = require('./validate');

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function getExportRoot() {
  return process.env.HTMLIFY_EXPORT_ROOT || process.env.PI_HTML_LONG_ANSWER_EXPORT_ROOT || DEFAULT_EXPORT_ROOT;
}

async function writeHtmlArtifact({ title, bodyHtml, sourceText, mode }) {
  const exportRoot = getExportRoot();
  await ensureDir(exportRoot);
  const now = new Date();
  const iso = now.toISOString().replace(/[:.]/g, '-');
  const fileName = `${iso}-${slugify(title)}-${mode}.html`;
  const filePath = path.join(exportRoot, fileName);
  const sourceId = sha(sourceText);
  const annotatedBodyHtml = addCommentableAttributes(bodyHtml);
  const html = buildLocalHtmlDocument(title, annotatedBodyHtml, {
    exportedAt: now.toISOString(),
    words: wordCount(sourceText),
    characters: String(sourceText || '').length,
    mode,
    excerpt: deriveExcerpt(sourceText),
    outlineHtml: buildOutlineHtml(sourceText),
    sourceId,
  });
  await fs.writeFile(filePath, injectAnnotationLayer(html, { sourceId, title }), 'utf8');
  return filePath;
}

async function writeRichHtmlArtifact({ title, htmlText, sourceId }) {
  const html = validateRichHtmlDocument(htmlText);
  const exportRoot = getExportRoot();
  await ensureDir(exportRoot);
  const now = new Date();
  const iso = now.toISOString().replace(/[:.]/g, '-');
  const fileName = `${iso}-${slugify(title)}-llm-enhanced.html`;
  const filePath = path.join(exportRoot, fileName);
  const annotatedHtml = addCommentableAttributes(html);
  await fs.writeFile(filePath, injectAnnotationLayer(annotatedHtml, { sourceId, title }), 'utf8');
  return filePath;
}

module.exports = {
  ensureDir,
  getExportRoot,
  writeHtmlArtifact,
  writeRichHtmlArtifact,
};
