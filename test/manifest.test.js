const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const packageJson = require('../package.json');

/** @param {string} relPath */
function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

/** @param {string} relPath */
function readJson(relPath) {
  return JSON.parse(read(relPath));
}

test('claude plugin manifest is valid and version-synced', () => {
  const plugin = readJson('.claude-plugin/plugin.json');
  assert.equal(plugin.name, 'htmlify');
  assert.equal(plugin.version, packageJson.version);
  assert.equal(plugin.license, 'Apache-2.0');
  assert.ok(plugin.description.length > 0);

  const marketplace = readJson('.claude-plugin/marketplace.json');
  assert.equal(marketplace.name, 'htmlify');
  assert.equal(marketplace.plugins.length, 1);
  assert.equal(marketplace.plugins[0].name, 'htmlify');
  assert.equal(marketplace.plugins[0].source, './');
});

test('hooks.json wires the stop hook to a file that exists and stays opt-in', () => {
  const hooks = readJson('hooks/hooks.json');
  const stop = hooks.hooks.Stop[0].hooks[0];
  assert.equal(stop.type, 'command');
  assert.match(stop.command, /\$\{CLAUDE_PLUGIN_ROOT\}\/hooks\/claude-code-stop-htmlify\.js/);
  assert.ok(fs.existsSync(path.join(repoRoot, 'hooks', 'claude-code-stop-htmlify.js')));
});

test('both skills have valid frontmatter and resolvable reference links', () => {
  for (const skill of ['htmlify', 'deckify']) {
    const skillDir = path.join(repoRoot, 'skills', skill);
    const text = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
    const frontmatter = /^---\n([\s\S]*?)\n---/.exec(text);
    assert.ok(frontmatter, `${skill} SKILL.md must start with frontmatter`);
    assert.match(frontmatter[1], new RegExp(`^name: ${skill}$`, 'm'));
    assert.match(frontmatter[1], /^description: .{40,}/m);
    assert.match(frontmatter[1], /^license: Apache-2.0$/m);
    assert.match(frontmatter[1], /version: "\d+\.\d+\.\d+" # x-release-please-version/);

    for (const link of text.matchAll(/\]\((references\/[^)]+)\)/g)) {
      assert.ok(fs.existsSync(path.join(skillDir, link[1])), `${skill}: missing reference ${link[1]}`);
    }
  }
});

test('the hardcopy spec ships identically in both skills', () => {
  const a = read('skills/htmlify/references/hardcopy.md');
  const b = read('skills/deckify/references/hardcopy.md');
  assert.equal(a, b, 'skills/*/references/hardcopy.md copies have drifted — sync them');
});

test('npm files cover everything bin, hooks, and the plugin need', () => {
  for (const entry of ['index.js', 'src/', 'bin/', 'hooks/', 'skills/', '.claude-plugin/']) {
    assert.ok(packageJson.files.includes(entry), `package.json files must include ${entry}`);
  }
  for (const script of ['bin/htmlify-answer.js', 'hooks/claude-code-stop-htmlify.js']) {
    const source = read(script);
    for (const match of source.matchAll(/require\('([^']+)'\)/g)) {
      const target = match[1];
      if (!target.startsWith('.')) continue;
      const resolved = path.relative(repoRoot, path.resolve(repoRoot, path.dirname(script), target));
      assert.ok(
        packageJson.files.some((entry) => resolved === entry || resolved.startsWith(entry.replace(/\/$/, ''))),
        `${script} requires ${resolved}, which is outside the published file set`
      );
    }
  }
});
