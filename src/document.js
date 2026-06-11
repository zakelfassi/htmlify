const { escapeHtml } = require('./text');
const { formatInline } = require('./markdown');

/** @typedef {import('./extension/types').ArtifactMeta} ArtifactMeta */

/**
 * @param {any} text
 * @returns {string}
 */
function deriveTitle(text) {
  const source = String(text || '').trim();
  if (!source) return 'HTML Export';
  const firstHeading = source.split('\n').find((line) => /^#{1,6}\s+/.test(line.trim()));
  if (firstHeading)
    return firstHeading
      .replace(/^#{1,6}\s+/, '')
      .trim()
      .slice(0, 80);
  const firstSentence = source.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/)[0] || source;
  return firstSentence.slice(0, 80);
}

/**
 * @param {any} text
 * @returns {string}
 */
function deriveExcerpt(text) {
  const lines = String(text || '').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^#{1,6}\s+/.test(trimmed)) continue;
    if (/^(?:[-*]|\d+\.)\s+/.test(trimmed)) continue;
    return trimmed.slice(0, 240);
  }
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

/**
 * @param {any} text
 * @returns {string}
 */
function buildOutlineHtml(text) {
  const headings = [];
  const lines = String(text || '').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (match) headings.push({ level: match[1].length, label: match[2].trim() });
  }
  if (!headings.length) return '';
  return `<div class="aside-panel"><div class="aside-label">Outline</div><ul class="outline-list">${headings.map((item) => `<li class="outline-item outline-level-${Math.min(item.level, 4)}">${formatInline(item.label)}</li>`).join('')}</ul></div>`;
}

/**
 * @param {string} title
 * @param {string} body
 * @param {ArtifactMeta} meta
 * @returns {string}
 */
function buildLocalHtmlDocument(title, body, meta) {
  const exportedAt = new Date(meta.exportedAt).toLocaleString();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7fb;
      --panel: #fbfdff;
      --text: #162033;
      --muted: #5d6b82;
      --line: #d8deea;
      --brand: #1c7c72;
      --accent: #d7f0eb;
      --callout: #eef6ff;
      --code: #0f172a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font: 16px/1.65 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: radial-gradient(circle at top right, rgba(28,124,114,0.08), transparent 26%), var(--bg);
      color: var(--text);
    }
    .wrap { max-width: 1120px; margin: 0 auto; padding: 32px 20px 64px; }
    .hero, .content, .aside-panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 20px;
      box-shadow: 0 20px 45px -36px rgba(15, 23, 42, 0.35);
    }
    .hero { padding: 28px; margin-bottom: 20px; }
    .hero-copy { max-width: 780px; }
    .hero-excerpt { font-size: 18px; line-height: 1.6; color: var(--muted); margin: 0 0 18px; }
    .main-grid { display: grid; gap: 20px; grid-template-columns: minmax(0, 1fr) 280px; align-items: start; }
    .content { padding: 28px; min-width: 0; }
    .aside-stack { display: grid; gap: 16px; position: sticky; top: 20px; }
    .aside-panel { padding: 18px; }
    .aside-label { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--brand); margin-bottom: 10px; }
    .aside-copy { color: var(--muted); font-size: 14px; line-height: 1.55; }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      padding: 6px 10px;
      border-radius: 999px;
      background: var(--accent);
      color: var(--brand);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    h1 { font-size: clamp(30px, 4vw, 42px); line-height: 1.08; margin: 0 0 12px; }
    h2, h3, h4, h5, h6 { line-height: 1.18; margin: 28px 0 10px; }
    p, li { color: var(--text); }
    p { margin: 0 0 14px; }
    .meta { display: flex; flex-wrap: wrap; gap: 12px; color: var(--muted); font-size: 14px; }
    .meta-chip {
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: #fbfcfe;
    }
    .meta-chip strong { color: var(--text); }
    .outline-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    .outline-item { color: var(--text); font-size: 14px; line-height: 1.4; }
    .outline-level-2 { padding-left: 10px; color: var(--muted); }
    .outline-level-3, .outline-level-4 { padding-left: 20px; color: var(--muted); font-size: 13px; }
    .content a { color: var(--brand); }
    .content ul, .content ol { margin: 0 0 18px 22px; }
    .content li { margin-bottom: 8px; }
    .content code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background: #f2f5fb;
      border: 1px solid #e0e6f2;
      border-radius: 6px;
      padding: 0.12rem 0.35rem;
      font-size: 0.92em;
    }
    .code-block {
      margin: 18px 0 22px;
      overflow: hidden;
      border-radius: 16px;
      background: var(--code);
      color: #e5edf8;
      border: 1px solid #22304a;
    }
    .code-meta {
      padding: 10px 14px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #9bb0d1;
      border-bottom: 1px solid #22304a;
    }
    .code-block code {
      display: block;
      padding: 16px;
      border: 0;
      background: transparent;
      white-space: pre-wrap;
      overflow-x: auto;
      color: inherit;
    }
    .callout {
      margin: 20px 0;
      padding: 16px 18px;
      border-radius: 16px;
      border: 1px solid #d9e8ff;
      background: var(--callout);
    }
    .callout-label {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #3559a6;
      margin-bottom: 8px;
    }
    .table-wrap { overflow-x: auto; margin: 18px 0 22px; }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--line);
      border-radius: 14px;
      overflow: hidden;
      background: #fbfdff;
    }
    th, td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
    }
    th { background: #f8fafc; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
    tr:last-child td { border-bottom: 0; }
    @media (max-width: 960px) {
      .main-grid { grid-template-columns: 1fr; }
      .aside-stack { position: static; }
    }
    @media print {
      body { background: #fbfdff; }
      .wrap { max-width: none; padding: 0; }
      .hero, .content, .aside-panel { border: 0; box-shadow: none; }
      .main-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow">htmlify export</div>
        <h1>${escapeHtml(title)}</h1>
        ${meta.excerpt ? `<p class="hero-excerpt">${escapeHtml(meta.excerpt)}</p>` : ''}
        <div class="meta">
          <div class="meta-chip"><strong>Exported</strong><br />${escapeHtml(exportedAt)}</div>
          <div class="meta-chip"><strong>Words</strong><br />${escapeHtml(String(meta.words))}</div>
          <div class="meta-chip"><strong>Characters</strong><br />${escapeHtml(String(meta.characters))}</div>
          <div class="meta-chip"><strong>Mode</strong><br />${escapeHtml(meta.mode)}</div>
        </div>
      </div>
    </section>
    <section class="main-grid">
      <article class="content">
        ${body}
      </article>
      <aside class="aside-stack">
        ${meta.outlineHtml || ''}
        <div class="aside-panel">
          <div class="aside-label">Export mode</div>
          <div class="aside-copy">
            ${meta.mode === 'local' ? 'Fast local render of the captured answer.' : 'Designed render produced from a richer HTML generation pass.'}
          </div>
        </div>
      </aside>
    </section>
  </main>
</body>
</html>`;
}

module.exports = {
  deriveTitle,
  deriveExcerpt,
  buildOutlineHtml,
  buildLocalHtmlDocument,
};
