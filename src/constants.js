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
  OPEN_FAILURE_WINDOW_MS,
  TRUSTED_ANNOTATION_MARKER,
};
