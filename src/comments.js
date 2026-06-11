const { COMMENT_BUNDLE_VERSION } = require('./constants');

/** @typedef {import('./extension/types').CommentBundle} CommentBundle */

/**
 * @param {any} bundle
 * @param {string | null | undefined} [expectedSourceId]
 * @returns {CommentBundle}
 */
function validateCommentBundle(bundle, expectedSourceId) {
  if (!bundle || typeof bundle !== 'object') throw new Error('Comment bundle must be a JSON object.');
  if (bundle.version !== COMMENT_BUNDLE_VERSION)
    throw new Error(`Comment bundle version must be ${COMMENT_BUNDLE_VERSION}.`);
  if (!Array.isArray(bundle.comments)) throw new Error('Comment bundle must include a comments array.');
  if (expectedSourceId && bundle.sourceId && bundle.sourceId !== expectedSourceId) {
    throw new Error('Comment bundle source does not match the last captured answer.');
  }
  return {
    version: COMMENT_BUNDLE_VERSION,
    sourceId: String(bundle.sourceId || ''),
    title: String(bundle.title || 'HTML Export').slice(0, 160),
    exportUrl: String(bundle.exportUrl || ''),
    comments: bundle.comments.map((/** @type {any} */ comment, /** @type {number} */ index) => {
      if (!comment || typeof comment !== 'object') throw new Error(`Comment ${index + 1} must be an object.`);
      const selectedText = String(comment.selectedText || '').trim();
      const body = String(comment.comment || '').trim();
      if (!selectedText || !body) throw new Error(`Comment ${index + 1} must include selectedText and comment.`);
      return {
        id: String(comment.id || `comment-${index + 1}`).slice(0, 80),
        blockId: String(comment.blockId || '').slice(0, 80),
        selectedText: selectedText.slice(0, 4000),
        prefix: String(comment.prefix || '').slice(0, 1000),
        suffix: String(comment.suffix || '').slice(0, 1000),
        comment: body.slice(0, 4000),
        createdAt: String(comment.createdAt || ''),
      };
    }),
  };
}

/**
 * @param {CommentBundle} bundle
 * @returns {string}
 */
function buildCommentsPrompt(bundle) {
  const lines = [
    'I reviewed the HTML export and left comments.',
    '',
    `Source: ${bundle.title}`,
    `Source ID: ${bundle.sourceId || 'unknown'}`,
    bundle.exportUrl ? `Export: ${bundle.exportUrl}` : '',
    '',
  ].filter((line, index) => line || index < 4);
  bundle.comments.forEach((comment, index) => {
    lines.push(
      `## Comment ${index + 1}`,
      '',
      'Selected text:',
      `> ${comment.selectedText.replace(/\n/g, '\n> ')}`,
      '',
      'Nearby context:',
      `> ${comment.prefix} [${comment.selectedText}] ${comment.suffix}`.trim(),
      '',
      'Comment:',
      comment.comment,
      ''
    );
  });
  return lines.join('\n');
}

module.exports = {
  validateCommentBundle,
  buildCommentsPrompt,
};
