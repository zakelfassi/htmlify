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
  return `<div class="aside-panel"><div class="aside-label">Index</div><ul class="outline-list">${headings.map((item) => `<li class="outline-item outline-level-${Math.min(item.level, 4)}">${formatInline(item.label)}</li>`).join('')}</ul></div>`;
}

/**
 * Render the captured answer as a Hardcopy-styled standalone document:
 * plate title block, numbered index rail, carbon code wells, hairline
 * structure, dark mode, and print rules. See references/hardcopy.md in the
 * bundled skills for the canonical design spec.
 *
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
      color-scheme: light dark;
      --paper: #faf7f0;
      --surface: #ffffff;
      --ink: #1c1a15;
      --ink-2: #6e6759;
      --rule: #d9d2c3;
      --rule-strong: #1c1a15;
      --signal: #e84b0f;
      --signal-wash: #fbeae1;
      --code-bg: #211e18;
      --code-ink: #e8e2d4;
      --code-meta: #a39a88;
      --font-display: "Charter", "Bitstream Charter", "Sitka Text", Cambria, Georgia, serif;
      --font-body: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      --font-mono: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --paper: #161410;
        --surface: #1e1b16;
        --ink: #ede8dc;
        --ink-2: #a39a88;
        --rule: #3a352b;
        --rule-strong: #ede8dc;
        --signal: #ff6b2c;
        --signal-wash: #3a2114;
        --code-bg: #0e0d0a;
        --code-ink: #d8d2c4;
        --code-meta: #6e6759;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--paper);
      color: var(--ink);
      font: 15.5px/1.6 var(--font-body);
    }
    body::before, body::after, .wrap::before, .wrap::after {
      content: "";
      position: fixed;
      width: 14px;
      height: 14px;
      border-color: var(--rule);
      border-style: solid;
      pointer-events: none;
    }
    body::before { top: 10px; left: 10px; border-width: 1px 0 0 1px; }
    body::after { top: 10px; right: 10px; border-width: 1px 1px 0 0; }
    .wrap::before { bottom: 10px; left: 10px; border-width: 0 0 1px 1px; }
    .wrap::after { bottom: 10px; right: 10px; border-width: 0 1px 1px 0; }
    .wrap { max-width: 1120px; margin: 0 auto; padding: 40px 28px 72px; }
    .plate {
      border: 2px solid var(--rule-strong);
      margin-bottom: 36px;
    }
    .plate-head { display: flex; align-items: stretch; border-bottom: 1px solid var(--rule); }
    .eyebrow {
      display: flex;
      align-items: center;
      background: var(--signal);
      color: #fff;
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 8px 14px;
      white-space: nowrap;
    }
    .plate-title { padding: 14px 18px 12px; min-width: 0; }
    h1 {
      font-family: var(--font-display);
      font-weight: 400;
      font-size: clamp(26px, 4vw, 40px);
      line-height: 1.08;
      letter-spacing: -0.015em;
      margin: 0;
    }
    .hero-excerpt { margin: 8px 0 0; color: var(--ink-2); font-size: 15px; line-height: 1.55; max-width: 72ch; }
    .meta { display: flex; flex-wrap: wrap; }
    .meta-chip {
      flex: 1 1 auto;
      padding: 8px 14px;
      border-right: 1px solid var(--rule);
      font-family: var(--font-mono);
      font-size: 12px;
      letter-spacing: 0.04em;
      color: var(--ink);
    }
    .meta-chip:last-child { border-right: 0; }
    .meta-chip strong {
      display: block;
      font-weight: 400;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--ink-2);
      margin-bottom: 2px;
    }
    .meta-chip br { display: none; }
    .main-grid { display: grid; gap: 32px; grid-template-columns: minmax(0, 1fr) 264px; align-items: start; }
    .content { min-width: 0; }
    .aside-stack { display: grid; gap: 20px; position: sticky; top: 24px; }
    .aside-panel { border-top: 2px solid var(--rule-strong); padding-top: 10px; }
    .aside-label {
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--ink-2);
      margin-bottom: 10px;
    }
    .aside-copy { color: var(--ink-2); font-size: 13px; line-height: 1.55; }
    .outline-list { list-style: none; margin: 0; padding: 0; counter-reset: idx; }
    .outline-item {
      counter-increment: idx;
      font-size: 13px;
      line-height: 1.4;
      padding: 6px 0;
      border-bottom: 1px solid var(--rule);
    }
    .outline-item::before {
      content: counter(idx) ".0";
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.06em;
      color: var(--ink-2);
      margin-right: 9px;
    }
    .outline-level-2, .outline-level-3, .outline-level-4 { padding-left: 14px; color: var(--ink-2); }
    .outline-level-2::before, .outline-level-3::before, .outline-level-4::before { content: "·"; margin-right: 9px; }
    h2, h3, h4, h5, h6 {
      font-family: var(--font-display);
      font-weight: 400;
      line-height: 1.15;
      letter-spacing: -0.01em;
      margin: 34px 0 10px;
    }
    h2 { font-size: 26px; border-top: 2px solid var(--rule-strong); padding-top: 12px; }
    h3 { font-size: 21px; }
    p, li { color: var(--ink); }
    p { margin: 0 0 14px; }
    .content a { color: var(--signal); text-decoration-color: var(--rule); }
    .content a:hover { text-decoration-color: var(--signal); }
    .content ul, .content ol { margin: 0 0 18px 22px; padding: 0; }
    .content li { margin-bottom: 7px; }
    .content code {
      font-family: var(--font-mono);
      font-size: 0.88em;
      background: var(--surface);
      border: 1px solid var(--rule);
      border-radius: 2px;
      padding: 0.1rem 0.34rem;
    }
    .code-block {
      margin: 18px 0 22px;
      border-radius: 2px;
      background: var(--code-bg);
      color: var(--code-ink);
      overflow: hidden;
    }
    .code-meta {
      padding: 9px 14px;
      font-family: var(--font-mono);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--code-meta);
      border-bottom: 1px solid rgba(163, 154, 136, 0.25);
    }
    .code-block code {
      display: block;
      padding: 16px;
      border: 0;
      background: transparent;
      white-space: pre-wrap;
      overflow-x: auto;
      color: inherit;
      font-family: var(--font-mono);
      font-size: 12.5px;
    }
    .callout {
      margin: 20px 0;
      padding: 14px 16px;
      border-left: 3px solid var(--signal);
      background: var(--signal-wash);
    }
    .callout-label {
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--signal);
      margin-bottom: 6px;
    }
    .callout p { margin: 0; }
    .table-wrap { overflow-x: auto; margin: 18px 0 22px; }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--rule-strong);
    }
    th, td {
      padding: 10px 13px;
      text-align: left;
      border-bottom: 1px solid var(--rule);
      vertical-align: top;
      font-size: 14px;
    }
    th {
      font-family: var(--font-mono);
      font-weight: 400;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--ink-2);
      border-bottom: 1px solid var(--rule-strong);
    }
    tr:last-child td { border-bottom: 0; }
    @media (max-width: 960px) {
      .main-grid { grid-template-columns: 1fr; }
      .aside-stack { position: static; }
      .plate-head { flex-direction: column; }
      .eyebrow { justify-content: flex-start; }
    }
    @media print {
      :root { --paper: #ffffff; }
      .wrap { max-width: none; padding: 0; }
      .main-grid { grid-template-columns: 1fr; }
      .aside-stack { display: none; }
      .plate { break-inside: avoid; }
      .eyebrow { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 14mm; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <header class="plate">
      <div class="plate-head">
        <div class="eyebrow">htmlify export</div>
        <div class="plate-title">
          <h1>${escapeHtml(title)}</h1>
          ${meta.excerpt ? `<p class="hero-excerpt">${escapeHtml(meta.excerpt)}</p>` : ''}
        </div>
      </div>
      <div class="meta">
        <div class="meta-chip"><strong>Exported</strong><br />${escapeHtml(exportedAt)}</div>
        <div class="meta-chip"><strong>Words</strong><br />${escapeHtml(String(meta.words))}</div>
        <div class="meta-chip"><strong>Characters</strong><br />${escapeHtml(String(meta.characters))}</div>
        <div class="meta-chip"><strong>Mode</strong><br />${escapeHtml(meta.mode)}</div>
      </div>
    </header>
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
