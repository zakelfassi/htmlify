const {
  MAX_RICH_HTML_CHARS,
  MAX_RICH_HTML_TAGS,
  BLOCKED_RICH_TAGS,
  BLOCKED_META_REFRESH,
  EVENT_HANDLER_ATTR,
  JAVASCRIPT_URL_ATTR,
  EXTERNAL_ASSET_ATTR,
  EXTERNAL_CSS_URL,
} = require('./constants');

function validateRichHtmlDocument(htmlText) {
  const html = String(htmlText || '').trim();
  if (!html) {
    throw new Error('Rich HTML output was empty.');
  }
  if (html.length > MAX_RICH_HTML_CHARS) {
    throw new Error(`Rich HTML output exceeded ${MAX_RICH_HTML_CHARS} characters.`);
  }
  const tagCount = (html.match(/<\/?[a-z][^>]*>/gi) || []).length;
  if (tagCount > MAX_RICH_HTML_TAGS) {
    throw new Error(`Rich HTML output exceeded ${MAX_RICH_HTML_TAGS} HTML tags.`);
  }
  if (!/<html[\s>]/i.test(html) || !/<body[\s>]/i.test(html)) {
    throw new Error('Rich HTML output must be a standalone document with <html> and <body>.');
  }
  if (BLOCKED_RICH_TAGS.test(html)) {
    throw new Error('Rich HTML output contained a blocked HTML tag.');
  }
  if (BLOCKED_META_REFRESH.test(html)) {
    throw new Error('Rich HTML output contained a meta refresh.');
  }
  if (EVENT_HANDLER_ATTR.test(html)) {
    throw new Error('Rich HTML output contained an event-handler attribute.');
  }
  if (JAVASCRIPT_URL_ATTR.test(html)) {
    throw new Error('Rich HTML output contained a javascript: URL.');
  }
  if (EXTERNAL_ASSET_ATTR.test(html) || EXTERNAL_CSS_URL.test(html)) {
    throw new Error('Rich HTML output referenced an external asset.');
  }
  return /^<!DOCTYPE html/i.test(html) ? html : `<!DOCTYPE html>\n${html}`;
}

module.exports = {
  validateRichHtmlDocument,
};
