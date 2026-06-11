const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');

const { OPEN_FAILURE_WINDOW_MS } = require('../constants');

async function resolveOpenCommand(command) {
  if (!command) return null;
  if (path.isAbsolute(command)) {
    try {
      await fs.access(command, fs.constants.X_OK);
      return command;
    } catch (_) {
      return null;
    }
  }

  const searchPath = String(process.env.PATH || '')
    .split(path.delimiter)
    .filter(Boolean);
  for (const directory of searchPath) {
    const candidate = path.join(directory, command);
    try {
      await fs.access(candidate, fs.constants.X_OK);
      return candidate;
    } catch (_) {
      // Keep searching PATH.
    }
  }
  return null;
}

async function openArtifact(filePath) {
  if (process.env.HTMLIFY_SKIP_OPEN === '1' || process.env.PI_HTML_LONG_ANSWER_SKIP_OPEN === '1') return false;
  const command = process.platform === 'darwin' ? '/usr/bin/open' : process.platform === 'linux' ? 'xdg-open' : null;
  const executable = await resolveOpenCommand(command);
  if (!executable) return false;

  return new Promise((resolve) => {
    let child;
    let settled = false;
    let timer;

    const settle = (opened) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(opened);
    };

    try {
      child = spawn(executable, [filePath], {
        detached: true,
        stdio: 'ignore',
      });
    } catch (_) {
      settle(false);
      return;
    }

    child.once('error', () => settle(false));
    child.once('exit', (code) => settle(code === 0));
    child.unref();
    timer = setTimeout(() => settle(true), OPEN_FAILURE_WINDOW_MS);
  });
}

module.exports = {
  resolveOpenCommand,
  openArtifact,
};
