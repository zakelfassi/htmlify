const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { collectRichHtmlIssues, collectDeckIssues, validateDeckDocument, detectProfile } =
  require('../index.js')._internals;

const fixturesDir = path.join(__dirname, 'fixtures');

/** @param {string} name */
function fixture(name) {
  return fs.readFileSync(path.join(fixturesDir, name), 'utf8');
}

/** @param {{ code: string }[]} issues */
function codes(issues) {
  return issues.map((issue) => issue.code);
}

test('a template-shaped deck passes the deck profile', () => {
  const report = collectDeckIssues(fixture('deck-valid.html'), { baseDir: fixturesDir });
  assert.deepEqual(codes(report.errors), []);
  assert.equal(report.stats.slides, 3);
  assert.equal(report.stats.notes, 2);
  assert.equal(validateDeckDocument(fixture('deck-valid.html')).startsWith('<!DOCTYPE html'), true);
});

test('deck profile flags a missing keydown listener', () => {
  const report = collectDeckIssues(fixture('deck-no-keynav.html'));
  assert.ok(codes(report.errors).includes('no-keyboard-nav'));
});

test('deck profile flags substantive slides without speaker notes but tolerates divider slides', () => {
  const report = collectDeckIssues(fixture('deck-no-notes.html'));
  const missing = report.errors.filter((issue) => issue.code === 'missing-notes');
  assert.equal(missing.length, 1);
  assert.match(missing[0].message, /Opening/);
});

test('deck profile still bans external assets', () => {
  const report = collectDeckIssues(fixture('deck-external-asset.html'));
  assert.ok(codes(report.errors).includes('external-asset'));
  assert.throws(() => validateDeckDocument(fixture('deck-external-asset.html')), /external asset/);
});

test('deck profile requires at least two slides', () => {
  const report = collectDeckIssues(
    '<!DOCTYPE html><html><head><title>x</title><meta name="viewport" content="w" /></head><body><script>document.addEventListener("keydown", () => {});</script></body></html>'
  );
  assert.ok(codes(report.errors).includes('no-slides'));
});

test('app profile allows inline scripts but rejects script src, external links, and handlers', () => {
  const inline = collectRichHtmlIssues(fixture('rich-script.html'), { allowInlineScript: true });
  assert.deepEqual(codes(inline.errors), []);

  const srcScript = collectRichHtmlIssues(
    '<!DOCTYPE html><html><head></head><body><script src="https://example.com/x.js"></script></body></html>',
    { allowInlineScript: true }
  );
  assert.ok(codes(srcScript.errors).includes('external-script'));

  const externalLink = collectRichHtmlIssues(
    '<!DOCTYPE html><html><head><link rel="stylesheet" href="https://example.com/x.css" /></head><body></body></html>',
    { allowInlineScript: true }
  );
  assert.ok(codes(externalLink.errors).includes('external-link'));

  const dataLink = collectRichHtmlIssues(
    '<!DOCTYPE html><html><head><link rel="icon" href="data:image/svg+xml,%3Csvg%3E" /></head><body></body></html>',
    { allowInlineScript: true }
  );
  assert.deepEqual(codes(dataLink.errors), []);

  const handler = collectRichHtmlIssues('<!DOCTYPE html><html><body><button onclick="x()">x</button></body></html>', {
    allowInlineScript: true,
  });
  assert.ok(codes(handler.errors).includes('event-handler'));
});

test('rich profile still rejects any script (regression guard for the profile split)', () => {
  const report = collectRichHtmlIssues(fixture('rich-script.html'));
  assert.ok(codes(report.errors).includes('blocked-tag'));
  const valid = collectRichHtmlIssues(fixture('rich-valid.html'));
  assert.deepEqual(codes(valid.errors), []);
});

test('size limits: deck errors past 2 MiB and warns past 512 KiB', () => {
  const filler = 'a'.repeat(600 * 1024);
  const base = fixture('deck-valid.html').replace('</main>', `<!-- ${filler} --></main>`);
  const warned = collectDeckIssues(base);
  assert.ok(codes(warned.warnings).includes('large-file'));
  assert.deepEqual(codes(warned.errors), []);

  const huge = fixture('deck-valid.html').replace('</main>', `<!-- ${'a'.repeat(2 * 1024 * 1024 + 1)} --></main>`);
  const errored = collectDeckIssues(huge);
  assert.ok(codes(errored.errors).includes('too-large'));
});

test('missing local assets surface as warnings with baseDir context', () => {
  const html = fixture('deck-valid.html').replace(
    '<h1>Fixture Talk</h1>',
    '<h1>x</h1><img src="missing.png" alt="m" />'
  );
  const report = collectDeckIssues(html, { baseDir: fixturesDir });
  assert.ok(codes(report.warnings).includes('missing-local-asset'));
});

test('detectProfile sniffs deck, app, and rich shapes', () => {
  assert.equal(detectProfile(fixture('deck-valid.html')), 'deck');
  assert.equal(detectProfile(fixture('rich-script.html')), 'app');
  assert.equal(detectProfile(fixture('rich-valid.html')), 'rich');
});
