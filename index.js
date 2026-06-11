const createExtension = require('./src/extension');
const { buildLocalHtmlDocument } = require('./src/document');
const { formatInline, renderMarkdownish } = require('./src/markdown');
const { getExportRoot, writeHtmlArtifact, writeRichHtmlArtifact } = require('./src/artifacts');
const {
  validateRichHtmlDocument,
  validateDeckDocument,
  collectRichHtmlIssues,
  collectDeckIssues,
  detectProfile,
} = require('./src/validate');
const { addCommentableAttributes, buildAnnotationLayer, injectAnnotationLayer } = require('./src/annotation');
const { validateCommentBundle, buildCommentsPrompt } = require('./src/comments');
const { extractHtmlDocument } = require('./src/extension/messages');
const { parseArgs, parseHtmlCommandInput, resolveForcedExportMode, hasSelectableUi } = require('./src/extension/parse');
const { resolveOpenCommand } = require('./src/extension/open');
const { buildRichHtmlPrompt } = require('./src/extension/prompts');

module.exports = Object.assign(createExtension, {
  _internals: {
    buildLocalHtmlDocument,
    buildRichHtmlPrompt,
    extractHtmlDocument,
    formatInline,
    getExportRoot,
    parseArgs,
    parseHtmlLastInput: parseHtmlCommandInput,
    resolveOpenCommand,
    hasSelectableUi,
    renderMarkdownish,
    resolveForcedExportMode,
    validateRichHtmlDocument,
    validateDeckDocument,
    collectRichHtmlIssues,
    collectDeckIssues,
    detectProfile,
    addCommentableAttributes,
    buildAnnotationLayer,
    buildCommentsPrompt,
    injectAnnotationLayer,
    validateCommentBundle,
    writeHtmlArtifact,
    writeRichHtmlArtifact,
  },
});
