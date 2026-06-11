const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'bin', 'htmlify-answer.js');
const fixturesDir = path.join(__dirname, 'fixtures');

/**
 * @param {string[]} args
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string }>}
 */
function runCli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd: repoRoot,
      env: { ...process.env, HTMLIFY_SKIP_OPEN: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.stdin.end('');
  });
}

/** @param {string} name */
function fixture(name) {
  return path.join(fixturesDir, name);
}

test('cli validates a valid deck with exit code 0', async () => {
  const result = await runCli(['--validate', fixture('deck-valid.html'), '--profile', 'deck']);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /valid/);
  assert.match(result.stdout, /profile: deck/);
});

test('cli exits 1 with named issue codes on an invalid deck', async () => {
  const result = await runCli(['--validate', fixture('deck-no-notes.html'), '--profile', 'deck']);
  assert.equal(result.code, 1);
  assert.match(result.stdout, /error missing-notes/);
  assert.match(result.stdout, /INVALID/);
});

test('cli exits 2 on a missing file and on an unknown flag', async () => {
  const missing = await runCli(['--validate', fixture('does-not-exist.html')]);
  assert.equal(missing.code, 2);
  assert.match(missing.stderr, /Cannot read/);

  const badFlag = await runCli(['--frobnicate']);
  assert.equal(badFlag.code, 2);
  assert.match(badFlag.stderr, /Unknown argument/);

  const mixed = await runCli(['--validate', fixture('deck-valid.html'), '--title', 'x']);
  assert.equal(mixed.code, 2);
  assert.match(mixed.stderr, /cannot be combined/);
});

test('cli json output parses and includes deck stats', async () => {
  const result = await runCli(['--validate', fixture('deck-valid.html'), '--profile', 'deck', '--format', 'json']);
  assert.equal(result.code, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.valid, true);
  assert.equal(report.profile, 'deck');
  assert.equal(report.stats.slides, 3);
});

test('cli auto profile detection picks deck, app, and rich per file', async () => {
  const result = await runCli([
    '--validate',
    fixture('deck-valid.html'),
    fixture('rich-script.html'),
    fixture('rich-valid.html'),
    '--format',
    'json',
  ]);
  const reports = JSON.parse(result.stdout);
  assert.equal(reports.length, 3);
  assert.equal(reports[0].profile, 'deck');
  assert.equal(reports[1].profile, 'app');
  assert.equal(reports[2].profile, 'rich');
  assert.equal(result.code, 0);
});

test('cli rich profile fails a scripted document that the app profile accepts', async () => {
  const rich = await runCli(['--validate', fixture('rich-script.html'), '--profile', 'rich']);
  assert.equal(rich.code, 1);
  assert.match(rich.stdout, /blocked-tag/);

  const app = await runCli(['--validate', fixture('rich-script.html'), '--profile', 'app']);
  assert.equal(app.code, 0);
});
