/**
 * @param {any} rawArgs
 * @returns {string[]}
 */
function parseArgs(rawArgs) {
  if (Array.isArray(rawArgs)) return rawArgs.map((item) => String(item));
  if (typeof rawArgs === 'string') return rawArgs.trim().split(/\s+/).filter(Boolean);
  if (rawArgs && typeof rawArgs === 'object' && Array.isArray(rawArgs.args)) {
    return rawArgs.args.map((/** @type {any} */ item) => String(item));
  }
  return [];
}

/**
 * @param {any} text
 * @returns {{ command: string, args: string } | null}
 */
function parseHtmlCommandInput(text) {
  const source = typeof text === 'string' ? text.trim() : '';
  if (/^\/(?:html-last-version|htmlify-version)\s*$/i.test(source)) {
    return { command: 'version', args: '' };
  }

  let match = /^\/(?:html-last|htmlify|htmlify-last)(?:\s+([\s\S]*))?$/i.exec(source);
  if (match) return { command: 'export', args: match[1] || '' };

  match = /^\/(?:html-comments|htmlify-comments)(?:\s+([\s\S]*))?$/i.exec(source);
  if (match) return { command: 'comments', args: match[1] || '' };

  return null;
}

/**
 * @param {any} rawArgs
 * @returns {string | null}
 */
function resolveForcedExportMode(rawArgs) {
  const parsedArgs = parseArgs(rawArgs);
  if (parsedArgs.some((arg) => /^(choose|choices|chooser|menu)$/i.test(arg))) return 'choose';
  if (parsedArgs.some((arg) => /^(gemini)$/i.test(arg))) return 'rich-gemini';
  if (parsedArgs.some((arg) => /^(pi|claude|current)$/i.test(arg))) return 'rich-pi';
  if (parsedArgs.some((arg) => /^(local|quick)$/i.test(arg))) return 'local';
  if (parsedArgs.some((arg) => /^(rich|enhanced|designed)$/i.test(arg))) return 'rich-pi';
  return null;
}

/**
 * @param {any} ctx
 * @returns {boolean}
 */
function hasSelectableUi(ctx) {
  return Boolean(ctx && ctx.ui && typeof ctx.ui.select === 'function');
}

module.exports = {
  parseArgs,
  parseHtmlCommandInput,
  resolveForcedExportMode,
  hasSelectableUi,
};
