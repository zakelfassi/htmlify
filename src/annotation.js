const { COMMENT_BUNDLE_VERSION, TRUSTED_ANNOTATION_MARKER } = require('./constants');

/**
 * @param {any} html
 * @returns {string}
 */
function addCommentableAttributes(html) {
  let index = 0;
  return String(html || '').replace(
    /<(p|h[1-6]|li|pre|table|aside|blockquote)\b(?![^>]*\bdata-commentable=)([^>]*)>/gi,
    (match, tag, attrs) => {
      index += 1;
      return `<${tag}${attrs} data-commentable="true" data-block-id="b-${index}">`;
    }
  );
}

/**
 * @param {{ sourceId?: string, title?: string }} [meta]
 * @returns {string}
 */
function buildAnnotationLayer(meta) {
  const sourceId = String(meta && meta.sourceId ? meta.sourceId : '');
  const title = String(meta && meta.title ? meta.title : 'HTML Export');
  return `${TRUSTED_ANNOTATION_MARKER}
<style>
  .hla-comment-bar { position: fixed; right: 18px; bottom: 18px; z-index: 99999; display: flex; gap: 8px; flex-wrap: wrap; max-width: min(420px, calc(100vw - 36px)); font: 13px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .hla-comment-bar button, .hla-comment-panel button { border: 1px solid #b9c4d6; background: #fbfdff; color: #162033; border-radius: 999px; padding: 8px 11px; cursor: pointer; box-shadow: 0 8px 22px -18px rgba(15,23,42,.55); }
  .hla-comment-bar button:hover, .hla-comment-panel button:hover { background: #f4f7fb; }
  .hla-comment-panel { position: fixed; top: 16px; right: 16px; bottom: 72px; z-index: 99998; width: min(390px, calc(100vw - 32px)); overflow: auto; background: #fbfdff; color: #162033; border: 1px solid #cfd7e6; border-radius: 18px; box-shadow: 0 24px 70px -34px rgba(15,23,42,.55); padding: 16px; font: 13px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .hla-comment-panel[hidden] { display: none; }
  .hla-comment-panel h2 { margin: 0 0 10px; font-size: 16px; line-height: 1.2; }
  .hla-comment-panel textarea { width: 100%; min-height: 90px; resize: vertical; border: 1px solid #cfd7e6; border-radius: 12px; padding: 10px; font: inherit; color: inherit; background: #fbfdff; }
  .hla-comment-list { display: grid; gap: 10px; margin-top: 12px; }
  .hla-comment-card { border: 1px solid #dce3ef; border-radius: 14px; padding: 10px; background: #f8fafc; }
  .hla-comment-card blockquote { margin: 0 0 8px; padding: 8px 10px; border: 1px solid #c8d7d4; border-radius: 10px; color: #40506a; background: #eef7f5; }
  .hla-highlight { background: #fff0a8; border-radius: 3px; }
  .hla-comment-target { outline: 2px solid #1c7c72; outline-offset: 3px; }
</style>
<section class="hla-comment-panel" id="hla-comment-panel" hidden aria-label="HTML export comments">
  <h2>HTML comments</h2>
  <p>Select text in the export, then add a comment. Copy Markdown for the agent or download JSON.</p>
  <textarea id="hla-comment-input" placeholder="Comment on the selected text"></textarea>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
    <button type="button" id="hla-save-comment">Save comment</button>
    <button type="button" id="hla-copy-md">Copy Markdown</button>
    <button type="button" id="hla-download-json">Download JSON</button>
  </div>
  <div class="hla-comment-list" id="hla-comment-list"></div>
</section>
<div class="hla-comment-bar">
  <button type="button" id="hla-open-comments">Comments</button>
  <button type="button" id="hla-add-comment">Comment on selection</button>
</div>
<script>
(() => {
  const meta = { version: ${COMMENT_BUNDLE_VERSION}, sourceId: ${JSON.stringify(sourceId)}, title: ${JSON.stringify(title)}, exportUrl: location.href };
  const key = "htmlify-comments:" + (meta.sourceId || location.pathname);
  const panel = document.getElementById("hla-comment-panel");
  const input = document.getElementById("hla-comment-input");
  const list = document.getElementById("hla-comment-list");
  let pending = null;
  let comments = [];
  try { comments = JSON.parse(localStorage.getItem(key) || "[]"); } catch (_) { comments = []; }
  function closestBlock(node) {
    const el = node && (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement);
    return el ? el.closest("[data-commentable], p, li, h1, h2, h3, h4, h5, h6, pre, table, blockquote, aside") : null;
  }
  function contextFor(block, selected) {
    const text = (block ? block.textContent : document.body.textContent || "").replace(/\\s+/g, " ").trim();
    const needle = String(selected || "").replace(/\\s+/g, " ").trim();
    const at = needle ? text.indexOf(needle) : -1;
    return {
      prefix: at >= 0 ? text.slice(Math.max(0, at - 180), at) : text.slice(0, 180),
      suffix: at >= 0 ? text.slice(at + needle.length, at + needle.length + 180) : "",
    };
  }
  function persist() { localStorage.setItem(key, JSON.stringify(comments)); render(); }
  function bundle() { return { version: meta.version, sourceId: meta.sourceId, title: meta.title, exportUrl: meta.exportUrl, exportedAt: new Date().toISOString(), comments }; }
  function markdown() {
    const data = bundle();
    const lines = ["I reviewed the HTML export and left comments.", "", "Source: " + data.title, "Source ID: " + data.sourceId, ""];
    data.comments.forEach((comment, index) => {
      lines.push("## Comment " + (index + 1), "", "Selected text:", "> " + comment.selectedText.replace(/\\n/g, "\\n> "), "", "Nearby context:", "> " + (comment.prefix || "") + " [" + comment.selectedText + "] " + (comment.suffix || ""), "", "Comment:", comment.comment, "");
    });
    return lines.join("\\n");
  }
  function render() {
    list.innerHTML = "";
    comments.forEach((comment, index) => {
      const card = document.createElement("div");
      card.className = "hla-comment-card";
      const quote = document.createElement("blockquote");
      quote.textContent = comment.selectedText;
      const body = document.createElement("div");
      body.textContent = comment.comment;
      const jump = document.createElement("button");
      jump.type = "button";
      jump.textContent = "Jump";
      jump.onclick = () => {
        const target = comment.blockId ? document.querySelector('[data-block-id="' + CSS.escape(comment.blockId) + '"]') : null;
        if (target) { target.scrollIntoView({ behavior: "smooth", block: "center" }); target.classList.add("hla-comment-target"); setTimeout(() => target.classList.remove("hla-comment-target"), 1800); }
      };
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "Delete";
      del.onclick = () => { comments.splice(index, 1); persist(); };
      card.append(quote, body, jump, del);
      list.appendChild(card);
    });
  }
  document.getElementById("hla-open-comments").onclick = () => { panel.hidden = !panel.hidden; render(); };
  document.getElementById("hla-add-comment").onclick = () => {
    const selection = getSelection();
    const selectedText = selection ? String(selection).trim() : "";
    if (!selectedText) { alert("Select text in the export first."); return; }
    const block = closestBlock(selection.anchorNode) || closestBlock(selection.focusNode);
    const ctx = contextFor(block, selectedText);
    pending = { selectedText, blockId: block ? (block.dataset.blockId || "") : "", prefix: ctx.prefix, suffix: ctx.suffix };
    input.value = "";
    panel.hidden = false;
    input.focus();
  };
  document.getElementById("hla-save-comment").onclick = () => {
    if (!pending) { alert("Select text and click Comment on selection first."); return; }
    const text = input.value.trim();
    if (!text) { alert("Write a comment first."); return; }
    comments.push({ id: "cmt_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8), sourceId: meta.sourceId, blockId: pending.blockId, selectedText: pending.selectedText, prefix: pending.prefix, suffix: pending.suffix, comment: text, createdAt: new Date().toISOString() });
    pending = null;
    input.value = "";
    persist();
  };
  document.getElementById("hla-copy-md").onclick = async () => {
    const text = markdown();
    if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text);
    else prompt("Copy comments for the agent:", text);
  };
  document.getElementById("hla-download-json").onclick = () => {
    const blob = new Blob([JSON.stringify(bundle(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "html-comments-" + (meta.sourceId || "export").slice(0, 12) + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  render();
})();
</script>`;
}

/**
 * @param {any} html
 * @param {{ sourceId?: string, title?: string }} [meta]
 * @returns {string}
 */
function injectAnnotationLayer(html, meta) {
  const layer = buildAnnotationLayer(meta);
  const source = String(html || '');
  if (source.includes(TRUSTED_ANNOTATION_MARKER)) return source;
  if (/<\/body\s*>/i.test(source)) return source.replace(/<\/body\s*>/i, `${layer}\n</body>`);
  return `${source}\n${layer}`;
}

module.exports = {
  addCommentableAttributes,
  buildAnnotationLayer,
  injectAnnotationLayer,
};
