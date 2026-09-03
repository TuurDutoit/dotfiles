import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import why from '../bin/yarn-why';

const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'yarn-why');

function fixture(files) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'yarn-why-'));
  for (const [file, contents] of Object.entries(files)) {
    const target = path.join(directory, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
  return directory;
}

function runWhy(arguments_, cwd) {
  return spawnSync(process.execPath, [scriptPath, ...arguments_], { cwd, encoding: 'utf8' });
}

test('parses Yarn v1 and follows exact descriptors to a root manifest', (t) => {
  const directory = fixture({
    'package.json': JSON.stringify({ name: 'app', dependencies: { top: '^1.0.0' } }),
    'yarn.lock': `# yarn lockfile v1\n\nleaf@^1.0.0:\n  version "1.2.0"\n\nmid@^1.0.0:\n  version "1.0.0"\n  dependencies:\n    leaf "^1.0.0"\n\ntop@^1.0.0:\n  version "1.0.0"\n  dependencies:\n    mid "^1.0.0"\n`,
  });
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const output = why.renderWhy(path.join(directory, 'yarn.lock'), why.parseQuery('leaf'));
  assert.match(output, /leaf@1\.2\.0/);
  assert.match(output, /mid@1\.0\.0 \(requires leaf@\^1\.0\.0\)/);
  assert.match(output, /top@1\.0\.0 \(requires mid@\^1\.0\.0\)/);
  assert.match(output, /app \(package\.json dependencies → top@\^1\.0\.0\)/);
});

test('parses Berry descriptors, aliases, workspace roots, and cycles', (t) => {
  const directory = fixture({
    'package.json': JSON.stringify({ name: 'repo', workspaces: ['packages/**'] }),
    'packages/web/package.json': JSON.stringify({ name: 'web', devDependencies: { alias: 'npm:leaf@^1.0.0' } }),
    'yarn.lock': `__metadata:\n  version: 10\n\n"alias@npm:leaf@^1.0.0":\n  version: 1.4.0\n  resolution: "leaf@npm:1.4.0"\n  dependencies:\n    cycle: "npm:^1.0.0"\n\n"cycle@npm:^1.0.0":\n  version: 1.0.0\n  resolution: "cycle@npm:1.0.0"\n  dependencies:\n    alias: "npm:leaf@^1.0.0"\n`,
  });
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const output = why.renderWhy(path.join(directory, 'yarn.lock'), why.parseQuery('leaf@^1'));
  assert.match(output, /alias@1\.4\.0/);
  assert.match(output, /cycle@1\.0\.0 \(requires alias@npm:leaf@\^1\.0\.0\)/);
  assert.match(output, /cycle back to alias@1\.4\.0/);
  assert.match(output, /web \(package\.json devDependencies → alias@npm:leaf@\^1\.0\.0\)/);
});

test('splits quoted Berry keys that merge multiple descriptors onto one entry', (t) => {
  const directory = fixture({
    'package.json': JSON.stringify({ name: 'repo', dependencies: { leaf: '^1.0.0' } }),
    'yarn.lock': `__metadata:\n  version: 8\n  cacheKey: 10c0\n\n"leaf@npm:^1.0.0, leaf@npm:^1.5.0":\n  version: 1.9.0\n  resolution: "leaf@npm:1.9.0"\n  dependencies:\n    stem: "npm:^1.0.0"\n\n"stem@npm:^1.0.0":\n  version: 1.0.0\n  resolution: "stem@npm:1.0.0"\n\n"mid@npm:^1.0.0":\n  version: 1.0.0\n  resolution: "mid@npm:1.0.0"\n  dependencies:\n    leaf: "npm:^1.5.0"\n`,
  });
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const output = why.renderWhy(path.join(directory, 'yarn.lock'), why.parseQuery('leaf'));
  assert.match(output, /mid@1\.0\.0 \(requires leaf@npm:\^1\.5\.0\)/);
  assert.match(output, /repo \(package\.json dependencies → leaf@\^1\.0\.0\)/);
});

test('collapses workspace lock entries into their manifest root line', (t) => {
  const directory = fixture({
    'package.json': JSON.stringify({ name: 'repo', workspaces: ['packages/*'] }),
    'packages/api/package.json': JSON.stringify({ name: 'api', dependencies: { leaf: '^1.0.0' } }),
    'yarn.lock': `__metadata:\n  version: 8\n  cacheKey: 10c0\n\n"api@workspace:packages/api":\n  version: 0.0.0-use.local\n  resolution: "api@workspace:packages/api"\n  dependencies:\n    leaf: "npm:^1.0.0"\n  languageName: unknown\n  linkType: soft\n\n"leaf@npm:^1.0.0":\n  version: 1.0.0\n  resolution: "leaf@npm:1.0.0"\n`,
  });
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const output = why.renderWhy(path.join(directory, 'yarn.lock'), why.parseQuery('leaf'));
  assert.match(output, /api \(package\.json dependencies → leaf@\^1\.0\.0\)/);
  assert.doesNotMatch(output, /0\.0\.0-use\.local/);
  assert.doesNotMatch(output, /package\.json workspace/);
});

test('truncates subtrees already printed elsewhere in the same tree', (t) => {
  const directory = fixture({
    'package.json': JSON.stringify({ name: 'app', dependencies: { x: '^1.0.0' } }),
    'yarn.lock': `# yarn lockfile v1\n\nleaf@^1.0.0:\n  version "1.0.0"\n\nx@^1.0.0:\n  version "1.0.0"\n  dependencies:\n    y "^1.0.0"\n    z "^1.0.0"\n\ny@^1.0.0:\n  version "1.0.0"\n  dependencies:\n    leaf "^1.0.0"\n\nz@^1.0.0:\n  version "1.0.0"\n  dependencies:\n    leaf "^1.0.0"\n`,
  });
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const output = why.renderWhy(path.join(directory, 'yarn.lock'), why.parseQuery('leaf'));
  assert.equal((output.match(/x@1\.0\.0/g) || []).length, 2);
  assert.equal((output.match(/app \(package\.json dependencies → x@\^1\.0\.0\)/g) || []).length, 1);
});

test('limits depth counted from the root package with -d and --depth', (t) => {
  const directory = fixture({
    'package.json': JSON.stringify({ name: 'app', dependencies: { top: '^1.0.0', leaf: '^1.0.0' } }),
    'yarn.lock': `# yarn lockfile v1\n\nleaf@^1.0.0:\n  version "1.0.0"\n\nmid@^1.0.0:\n  version "1.0.0"\n  dependencies:\n    leaf "^1.0.0"\n\ntop@^1.0.0:\n  version "1.0.0"\n  dependencies:\n    mid "^1.0.0"\n`,
  });
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const lockfile = path.join(directory, 'yarn.lock');

  const unlimited = why.renderWhy(lockfile, why.parseQuery('leaf'));
  assert.match(unlimited, /mid@1\.0\.0 \(requires leaf@\^1\.0\.0\)/);
  assert.match(unlimited, /top@1\.0\.0 \(requires mid@\^1\.0\.0\)/);

  const depthOne = why.renderWhy(lockfile, why.parseQuery('leaf'), 1);
  assert.match(depthOne, /top@1\.0\.0 \(requires mid@\^1\.0\.0\)/);
  assert.doesNotMatch(depthOne, /mid@1\.0\.0/);
  assert.match(depthOne, /\.\.\./);

  const depthZero = why.renderWhy(lockfile, why.parseQuery('leaf'), 0);
  assert.match(depthZero, /app \(package\.json dependencies → leaf@\^1\.0\.0\)/);
  assert.doesNotMatch(depthZero, /requires/);

  for (const arguments_ of [['-d', '1', 'leaf'], ['--depth', '1', 'leaf'], ['leaf', '-d', '1']]) {
    const result = runWhy(arguments_, directory);
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /mid@1\.0\.0/);
  }

  const invalid = runWhy(['-d', 'oops', 'leaf'], directory);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /Depth must be a non-negative integer/);
});

test('supports exact, prefix, wildcard, caret, tilde, comparator, and OR version filters', () => {
  const match = why.versionMatches;
  assert.equal(match('1.2.3', '1.2.3'), true);
  assert.equal(match('1.2.3', '1.2'), true);
  assert.equal(match('1.2.3', '1.2.x'), true);
  assert.equal(match('1.2.3', '^1.0.0'), true);
  assert.equal(match('1.2.3', '~1.2.0'), true);
  assert.equal(match('1.2.3', '>=1.2 <2'), true);
  assert.equal(match('2.0.0', '^1.2.3 || ^2.0.0'), true);
  assert.equal(match('2.0.0', '~1.2.0'), false);
  assert.equal(match('2.3.9', '1.2 - 2.3'), true);
  assert.equal(match('2.4.0', '1.2 - 2.3'), false);
});

test('includes v1 optional dependencies in reverse dependency paths', (t) => {
  const directory = fixture({
    'package.json': JSON.stringify({ name: 'app', dependencies: { top: '^1' } }),
    'yarn.lock': `# yarn lockfile v1\n\nleaf@^1:\n  version "1.0.0"\n\ntop@^1:\n  version "1.0.0"\n  optionalDependencies:\n    leaf "^1"\n`,
  });
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const output = why.renderWhy(path.join(directory, 'yarn.lock'), why.parseQuery('leaf'));
  assert.match(output, /top@1\.0\.0 \(requires leaf@\^1\)/);
  assert.match(output, /app \(package\.json dependencies → top@\^1\)/);
});

test('accepts lockfile flags, retains positional compatibility, and prints the absolute path', (t) => {
  const directory = fixture({
    'yarn.lock': '# yarn lockfile v1\n\nleaf@^1:\n  version "1.0.0"\n',
  });
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const lockfile = path.join(directory, 'yarn.lock');

  for (const arguments_ of [
    ['--lockfile', lockfile, 'leaf'],
    ['-f', lockfile, 'leaf'],
    [lockfile, 'leaf'],
  ]) {
    const result = runWhy(arguments_, directory);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, new RegExp(`^Lockfile: ${lockfile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n`));
    assert.match(result.stdout, /Why leaf is installed:/);
  }
});

test('discovers the nearest parent yarn.lock when no lockfile is passed', (t) => {
  const directory = fixture({
    'yarn.lock': '# yarn lockfile v1\n\nleaf@^1:\n  version "1.0.0"\n',
    'nested/deeper/.keep': '',
  });
  t.after(() => rmSync(directory, { recursive: true, force: true }));

  const result = runWhy(['leaf'], path.join(directory, 'nested', 'deeper'));
  assert.equal(result.status, 0, result.stderr);
  const printedLockfile = result.stdout.match(/^Lockfile: (.*)$/m)?.[1];
  assert.equal(realpathSync(printedLockfile), realpathSync(path.join(directory, 'yarn.lock')));
});

test('reports malformed flags and a missing discovered lockfile clearly', (t) => {
  const directory = fixture({});
  t.after(() => rmSync(directory, { recursive: true, force: true }));

  const unknownFlag = runWhy(['--unknown', 'leaf'], directory);
  assert.equal(unknownFlag.status, 1);
  assert.match(unknownFlag.stderr, /Unknown option: --unknown/);

  const missingFlagValue = runWhy(['-f'], directory);
  assert.equal(missingFlagValue.status, 1);
  assert.match(missingFlagValue.stderr, /Missing lockfile path after -f/);

  const missingLockfile = runWhy(['leaf'], directory);
  assert.equal(missingLockfile.status, 1);
  assert.match(missingLockfile.stderr, /Could not find yarn\.lock in .* or its parent directories/);
});
