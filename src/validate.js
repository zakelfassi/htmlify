const fs = require('fs');
const path = require('path');

const {
  MAX_RICH_HTML_CHARS,
  MAX_RICH_HTML_TAGS,
  MAX_DECK_HTML_CHARS,
  WARN_HTML_CHARS,
  BLOCKED_RICH_TAGS,
  BLOCKED_EMBED_TAGS,
  BLOCKED_META_REFRESH,
  EVENT_HANDLER_ATTR,
  JAVASCRIPT_URL_ATTR,
  SCRIPT_SRC_ATTR,
  LINK_TAG,
  EXTERNAL_ASSET_ATTR,
  EXTERNAL_CSS_URL,
  SLIDE_SECTION,
  NOTES_ASIDE,
  KEYDOWN_LISTENER,
} = require('./constants');

/**
 * @typedef {{ code: string, message: string }} Issue
 * @typedef {{ errors: Issue[], warnings: Issue[] }} IssueReport
 * @typedef {{
 *   allowInlineScript?: boolean,
 *   maxChars?: number,
 *   maxTags?: number,
 *   baseDir?: string,
 * }} CollectOptions
 */

/**
 * @param {string} html
 * @param {string | undefined} baseDir
 * @param {Issue[]} warnings
 */
function checkLocalAssets(html, baseDir, warnings) {
  if (!baseDir) return;
  const refs = html.matchAll(/\s(?:src|href)\s*=\s*(['"])([^'"]+)\1/gi);
  for (const ref of refs) {
    const target = ref[2];
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)) continue; // absolute URL, data:, mailto:, anchor
    const cleaned = target.split(/[?#]/)[0];
    if (!cleaned || cleaned.endsWith('/')) continue;
    if (!fs.existsSync(path.resolve(baseDir, cleaned))) {
      warnings.push({ code: 'missing-local-asset', message: `Referenced local asset does not exist: ${target}` });
    }
  }
}

/**
 * Collect validation issues for a self-contained HTML document.
 *
 * The default options reproduce the historical rich-output rules (no scripts
 * at all). `allowInlineScript: true` switches to the interactive (app/deck)
 * profile: inline `<script>` and form controls are allowed, but external
 * scripts, embeds, event-handler attributes, and `javascript:` URLs stay
 * banned.
 *
 * @param {any} htmlText
 * @param {CollectOptions} [options]
 * @returns {IssueReport}
 */
function collectRichHtmlIssues(htmlText, options = {}) {
  const { allowInlineScript = false, maxChars = MAX_RICH_HTML_CHARS, maxTags = MAX_RICH_HTML_TAGS } = options;
  /** @type {Issue[]} */
  const errors = [];
  /** @type {Issue[]} */
  const warnings = [];
  const html = String(htmlText || '').trim();

  if (!html) {
    errors.push({ code: 'empty', message: 'Rich HTML output was empty.' });
    return { errors, warnings };
  }
  if (html.length > maxChars) {
    errors.push({ code: 'too-large', message: `Rich HTML output exceeded ${maxChars} characters.` });
  } else if (html.length > WARN_HTML_CHARS && maxChars > WARN_HTML_CHARS) {
    warnings.push({ code: 'large-file', message: `Document is larger than ${WARN_HTML_CHARS} characters.` });
  }
  const tagCount = (html.match(/<\/?[a-z][^>]*>/gi) || []).length;
  if (tagCount > maxTags) {
    errors.push({ code: 'too-many-tags', message: `Rich HTML output exceeded ${maxTags} HTML tags.` });
  }
  if (!/<html[\s>]/i.test(html) || !/<body[\s>]/i.test(html)) {
    errors.push({
      code: 'not-standalone',
      message: 'Rich HTML output must be a standalone document with <html> and <body>.',
    });
  }
  if (!/^<!DOCTYPE html/i.test(html)) {
    warnings.push({ code: 'no-doctype', message: 'Document does not start with <!DOCTYPE html>.' });
  }
  if (allowInlineScript) {
    if (BLOCKED_EMBED_TAGS.test(html)) {
      errors.push({ code: 'blocked-tag', message: 'Rich HTML output contained a blocked HTML tag.' });
    }
    if (SCRIPT_SRC_ATTR.test(html)) {
      errors.push({ code: 'external-script', message: 'Scripts must be inline; <script src> is not allowed.' });
    }
    for (const link of html.match(LINK_TAG) || []) {
      const href = /\shref\s*=\s*(['"]?)([^'">\s]+)\1/i.exec(link);
      if (href && !/^data:/i.test(href[2])) {
        errors.push({ code: 'external-link', message: `<link> may only use data: URLs, found: ${href[2]}` });
      }
    }
  } else if (BLOCKED_RICH_TAGS.test(html)) {
    errors.push({ code: 'blocked-tag', message: 'Rich HTML output contained a blocked HTML tag.' });
  }
  if (BLOCKED_META_REFRESH.test(html)) {
    errors.push({ code: 'meta-refresh', message: 'Rich HTML output contained a meta refresh.' });
  }
  if (EVENT_HANDLER_ATTR.test(html)) {
    errors.push({ code: 'event-handler', message: 'Rich HTML output contained an event-handler attribute.' });
  }
  if (JAVASCRIPT_URL_ATTR.test(html)) {
    errors.push({ code: 'javascript-url', message: 'Rich HTML output contained a javascript: URL.' });
  }
  if (EXTERNAL_ASSET_ATTR.test(html) || EXTERNAL_CSS_URL.test(html)) {
    errors.push({ code: 'external-asset', message: 'Rich HTML output referenced an external asset.' });
  }
  checkLocalAssets(html, options.baseDir, warnings);
  return { errors, warnings };
}

/**
 * Split a deck document into per-slide segments for notes inspection.
 *
 * @param {string} html
 * @returns {{ title: string, content: string }[]}
 */
function splitSlides(html) {
  const matches = Array.from(html.matchAll(SLIDE_SECTION));
  return matches.map((match, index) => {
    const start = (match.index || 0) + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : html.search(/<\/main\b/i);
    const title = /\bdata-title\s*=\s*(['"])([^'"]*)\1/i.exec(match[0]);
    return {
      title: title ? title[2] : `slide ${index + 1}`,
      content: html.slice(start, end === -1 ? undefined : end),
    };
  });
}

/**
 * Collect validation issues for a deckify presentation document.
 *
 * Runs the interactive-profile checks plus the deck contract from
 * skills/deckify/references/deck-template.md.
 *
 * @param {any} htmlText
 * @param {{ baseDir?: string }} [options]
 * @returns {IssueReport & { stats: { slides: number, notes: number } }}
 */
function collectDeckIssues(htmlText, options = {}) {
  const html = String(htmlText || '').trim();
  const { errors, warnings } = collectRichHtmlIssues(html, {
    allowInlineScript: true,
    maxChars: MAX_DECK_HTML_CHARS,
    maxTags: 20000,
    baseDir: options.baseDir,
  });

  if (!/<title>\s*[^<\s][^<]*<\/title>/i.test(html)) {
    errors.push({ code: 'no-title', message: 'Deck must have a non-empty <title>.' });
  }
  if (!/<meta\b[^>]*\bname\s*=\s*(['"])viewport\1/i.test(html)) {
    errors.push({ code: 'no-viewport', message: 'Deck must include a viewport meta tag.' });
  }

  const slides = splitSlides(html);
  if (slides.length < 2) {
    errors.push({
      code: 'no-slides',
      message: `Deck must contain at least 2 <section class="slide"> elements, found ${slides.length}.`,
    });
  }
  if (!KEYDOWN_LISTENER.test(html)) {
    errors.push({ code: 'no-keyboard-nav', message: 'Deck must register a keydown listener for slide navigation.' });
  }
  if (!/@media\s+print/i.test(html)) {
    warnings.push({ code: 'no-print-css', message: 'Deck has no @media print rules for guide/handout export.' });
  }

  let notes = 0;
  slides.forEach((slide, index) => {
    const hasNotes = NOTES_ASIDE.test(slide.content);
    if (hasNotes) notes += 1;
    const text = slide.content
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const substantive = text.length >= 200 || /<(?:h2|h3|table|figure)\b/i.test(slide.content);
    if (substantive && !hasNotes) {
      errors.push({
        code: 'missing-notes',
        message: `Substantive slide ${index + 1} ("${slide.title}") has no <aside class="notes"> speaker notes.`,
      });
    }
  });

  return { errors, warnings, stats: { slides: slides.length, notes } };
}

/**
 * Validate model-generated rich HTML before writing it to disk. Throws on the
 * first error and returns the document with a guaranteed doctype.
 *
 * @param {any} htmlText
 * @returns {string}
 */
function validateRichHtmlDocument(htmlText) {
  const html = String(htmlText || '').trim();
  const { errors } = collectRichHtmlIssues(html);
  if (errors.length) {
    throw new Error(errors[0].message);
  }
  return /^<!DOCTYPE html/i.test(html) ? html : `<!DOCTYPE html>\n${html}`;
}

/**
 * Validate a deck document. Throws on the first error.
 *
 * @param {any} htmlText
 * @returns {string}
 */
function validateDeckDocument(htmlText) {
  const html = String(htmlText || '').trim();
  const { errors } = collectDeckIssues(html);
  if (errors.length) {
    throw new Error(errors[0].message);
  }
  return html;
}

/**
 * Pick a validation profile by sniffing the document shape: slide sections
 * plus speaker notes mean deck; any inline script means app; otherwise rich.
 *
 * @param {any} htmlText
 * @returns {'rich' | 'app' | 'deck'}
 */
function detectProfile(htmlText) {
  const html = String(htmlText || '');
  SLIDE_SECTION.lastIndex = 0;
  if (SLIDE_SECTION.test(html) && NOTES_ASIDE.test(html)) {
    SLIDE_SECTION.lastIndex = 0;
    return 'deck';
  }
  SLIDE_SECTION.lastIndex = 0;
  if (/<script\b/i.test(html)) return 'app';
  return 'rich';
}

module.exports = {
  collectRichHtmlIssues,
  collectDeckIssues,
  validateRichHtmlDocument,
  validateDeckDocument,
  detectProfile,
};
