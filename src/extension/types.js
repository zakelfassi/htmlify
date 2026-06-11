/**
 * JSDoc-only typedef module for htmlify. The empty export keeps this a
 * CommonJS module so `import('./types')` works from JSDoc annotations.
 */

/**
 * Host surface provided by Pi/OMP. Every member is optional because the
 * factory guards each one with `typeof` checks before use.
 *
 * @typedef {object} PiHost
 * @property {(eventName: string, handler: (event: any, ctx: ExtensionCtx) => unknown) => unknown} [on]
 * @property {(name: string, definition: { description: string, handler: (args: any, ctx: ExtensionCtx) => unknown }) => unknown} [registerCommand]
 * @property {(type: string, data: object) => Promise<unknown>} [appendEntry]
 * @property {(label: string) => unknown} [setLabel]
 * @property {(message: string, options?: object) => Promise<unknown>} [sendUserMessage]
 * @property {(message: string, options?: object) => Promise<unknown>} [sendMessage]
 */

/**
 * Per-event context object passed by the host. Shape is host-dependent, so
 * everything is optional and runtime-guarded.
 *
 * @typedef {object} ExtensionCtx
 * @property {{ notify?: (message: string, level?: string) => any, select?: (prompt: string, options: Array<{ label: string, value: string }>) => any }} [ui]
 * @property {{ getBranch?: () => unknown[] }} [sessionManager]
 */

/**
 * Metadata passed to buildLocalHtmlDocument.
 *
 * @typedef {object} ArtifactMeta
 * @property {string} exportedAt
 * @property {number} words
 * @property {number} characters
 * @property {string} mode
 * @property {string} excerpt
 * @property {string} outlineHtml
 * @property {string} sourceId
 */

/**
 * Captured assistant answer eligible for export.
 *
 * @typedef {object} SourceRecord
 * @property {string} id
 * @property {string} title
 * @property {string} text
 * @property {number} recordedAt
 * @property {{ characters: number, lines: number, paragraphs: number, words: number }} stats
 */

/**
 * Persisted record of a written HTML export.
 *
 * @typedef {object} ExportMeta
 * @property {string} path
 * @property {string} mode
 * @property {string} title
 * @property {string} sourceId
 * @property {number} exportedAt
 */

/**
 * A single reviewer comment captured in the annotation layer.
 *
 * @typedef {object} CommentRecord
 * @property {string} id
 * @property {string} blockId
 * @property {string} selectedText
 * @property {string} prefix
 * @property {string} suffix
 * @property {string} comment
 * @property {string} createdAt
 */

/**
 * Validated bundle of reviewer comments.
 *
 * @typedef {object} CommentBundle
 * @property {number} version
 * @property {string} sourceId
 * @property {string} title
 * @property {string} exportUrl
 * @property {CommentRecord[]} comments
 */

module.exports = {};
