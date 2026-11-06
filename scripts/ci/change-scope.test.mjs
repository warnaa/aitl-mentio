import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { classifyChanges, requiresApplicationChecks } from './change-scope.mjs';

test('documentation and artifact-policy changes use lightweight checks', () => {
  assert.equal(requiresApplicationChecks([
    'AGENTS.md', '.gitignore', '.ai/lessons.md',
    '.ai/skills/om-integration-tests/SKILL.md',
    '.ai/skills/om-prepare-test-env/SKILL.md',
    '.ai/runs/2026-11-06-comparison.md', '.ai/qa/AUTH/screenshot.png',
    '.ai/analysis/notes.txt', '.ai/lessons/details.md',
  ]), false);
});

test('code, configuration, dependencies, executable MDX and unknown paths run application checks', () => {
  for (const path of [
    'packages/app/src/app/page.tsx', 'tests/integration/auth.integration.test.ts',
    'scripts/ci/change-scope.mjs', '.ai/scripts/test-env.mjs',
    '.ai/qa/helper.mjs', '.ai/runs/reproduce.sh', '.ai/analysis/config.json',
    'packages/ui/.storybook/Guidelines.mdx', 'package-lock.json', 'package.json',
    '.github/workflows/ci.yml', 'tsconfig.json', '.env.example',
    'docker-compose.yml', 'new-unknown-file',
  ]) {
    assert.equal(requiresApplicationChecks([path]), true, path);
    assert.equal(requiresApplicationChecks(['README.md', path]), true, `mixed: ${path}`);
  }
  assert.equal(requiresApplicationChecks([]), true);
});

test('missing or invalid SHAs fail instead of classifying as documentation', () => {
  assert.throws(() => classifyChanges(undefined, 'HEAD'), /commit SHAs/);
  assert.throws(() => classifyChanges('--help', '--help'), /commit SHAs/);
});

test('real Git history covers whole PRs, deletions, renames and filenames with newlines', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'devmentor-ci-'));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const write = (name, content) => writeFileSync(join(cwd, name), content);
  const commit = () => {
    git('add', '-A');
    git('commit', '-qm', 'fixture');
    return git('rev-parse', 'HEAD');
  };
  try {
    git('init', '-q');
    git('config', 'user.email', 'ci@devmentor.test');
    git('config', 'user.name', 'CI fixture');
    git('config', 'commit.gpgsign', 'false');
    write('README.md', 'base');
    write('app.ts', 'base');
    const base = commit();
    write('README.md', 'docs');
    const docs = commit();
    assert.equal(classifyChanges(base, docs, cwd), false);
    const cli = fileURLToPath(new URL('./change-scope.mjs', import.meta.url));
    assert.equal(execFileSync(process.execPath, [cli, base, docs], {
      cwd, encoding: 'utf8',
    }).trim(), 'application=false');
    // Changes made only on the base branch must not count as PR changes.
    git('checkout', '-q', base);
    write('base-only.ts', 'base branch advanced');
    const advancedBase = commit();
    assert.equal(classifyChanges(advancedBase, docs, cwd), false);
    git('checkout', '-q', docs);
    write('app.ts', 'code');
    const code = commit();
    write('README.md', 'latest commit docs only');
    const mixed = commit();
    assert.equal(classifyChanges(base, mixed, cwd), true);
    // A same-content rename must retain its deleted executable path.
    renameSync(join(cwd, 'app.ts'), join(cwd, 'app.md'));
    const renamed = commit();
    assert.equal(classifyChanges(mixed, renamed, cwd), true);
    git('checkout', '-q', code);
    rmSync(join(cwd, 'app.ts'));
    assert.equal(classifyChanges(code, commit(), cwd), true);
    assert.throws(() => classifyChanges('f'.repeat(40), code, cwd));
    // NUL-separated Git output must not split a single Markdown filename.
    // Windows cannot create newline-containing filenames.
    if (process.platform !== 'win32') {
      mkdirSync(join(cwd, 'docs'));
      write('docs/odd\nname.md', 'docs');
      const before = git('rev-parse', 'HEAD');
      assert.equal(classifyChanges(before, commit(), cwd), false);
    }
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
