const path = require('path');
const os = require('os');

const packageJson = require('../package.json');

const EXTENSION_VERSION = packageJson.version;
const PRODUCT_NAME = 'htmlify';

const DEFAULT_EXPORT_ROOT = path.join(os.tmpdir(), 'htmlify-exports');
// Keep legacy custom entry types so existing Pi/OMP sessions can restore pre-rename exports.
const PREF_ENTRY_TYPE = 'html-long-answer-pref';
const SOURCE_ENTRY_TYPE = 'html-long-answer-source';
const EXPORT_ENTRY_TYPE = 'html-long-answer-export';
const COMMENT_ENTRY_TYPE = 'html-long-answer-comments';
const COMMENT_BUNDLE_VERSION = 1;
const LONG_ANSWER_DEFAULTS = {
  minChars: 1800,
  minLines: 24,
  minParagraphs: 6,
};
const MAX_RICH_HTML_CHARS = 512 * 1024;
const MAX_RICH_HTML_TAGS = 2500;
const BLOCKED_RICH_TAGS =
  /<\s*\/?\s*(?:script|iframe|object|embed|link|base|form|input|button|textarea|select|option)\b/i;
const BLOCKED_META_REFRESH = /<\s*meta\b[^>]*http-equiv\s*=\s*(['"]?)refresh\1/i;
const EVENT_HANDLER_ATTR = /\s+on[a-z]+\s*=/i;
const JAVASCRIPT_URL_ATTR = /\s(?:href|src|xlink:href|action|formaction)\s*=\s*(['"]?)\s*javascript:/i;
const EXTERNAL_ASSET_ATTR =
  /(?:\s(?:src|poster)\s*=\s*(['"]?)\s*(?:https?:)?\/\/|\ssrcset\s*=\s*(['"]?)[^'">]*(?:https?:)?\/\/|<\s*(?:image|use|feimage)\b[^>]*\s(?:href|xlink:href)\s*=\s*(['"]?)\s*(?:https?:)?\/\/)/i;
const EXTERNAL_CSS_URL = /(?:url\(\s*(['"]?)\s*(?:https?:)?\/\/|@import\s+(?:url\(\s*)?(['"]?)\s*(?:https?:)?\/\/)/i;
// Interactive (app/deck) profiles allow inline scripts and form controls but still ban embeds.
const BLOCKED_EMBED_TAGS = /<\s*\/?\s*(?:iframe|object|embed|base)\b/i;
const SCRIPT_SRC_ATTR = /<\s*script\b[^>]*\ssrc\s*=/i;
const LINK_TAG = /<\s*link\b[^>]*>/gi;
const MAX_DECK_HTML_CHARS = 2 * 1024 * 1024;
const WARN_HTML_CHARS = 512 * 1024;
const SLIDE_SECTION = /<section\b[^>]*\bclass\s*=\s*(['"])[^'"]*\bslide\b[^'"]*\1[^>]*>/gi;
const NOTES_ASIDE = /<aside\b[^>]*\bclass\s*=\s*(['"])[^'"]*\bnotes\b[^'"]*\1[^>]*>/i;
const KEYDOWN_LISTENER = /(?:addEventListener\s*\(\s*['"]keydown['"]|\.onkeydown\s*=)/;
const OPEN_FAILURE_WINDOW_MS = 1000;

const TRUSTED_ANNOTATION_MARKER = '<!-- htmlify trusted annotation layer -->';

module.exports = {
  EXTENSION_VERSION,
  PRODUCT_NAME,
  DEFAULT_EXPORT_ROOT,
  PREF_ENTRY_TYPE,
  SOURCE_ENTRY_TYPE,
  EXPORT_ENTRY_TYPE,
  COMMENT_ENTRY_TYPE,
  COMMENT_BUNDLE_VERSION,
  LONG_ANSWER_DEFAULTS,
  MAX_RICH_HTML_CHARS,
  MAX_RICH_HTML_TAGS,
  BLOCKED_RICH_TAGS,
  BLOCKED_META_REFRESH,
  EVENT_HANDLER_ATTR,
  JAVASCRIPT_URL_ATTR,
  EXTERNAL_ASSET_ATTR,
  EXTERNAL_CSS_URL,
  BLOCKED_EMBED_TAGS,
  SCRIPT_SRC_ATTR,
  LINK_TAG,
  MAX_DECK_HTML_CHARS,
  WARN_HTML_CHARS,
  SLIDE_SECTION,
  NOTES_ASIDE,
  KEYDOWN_LISTENER,
  OPEN_FAILURE_WINDOW_MS,
  TRUSTED_ANNOTATION_MARKER,
};
