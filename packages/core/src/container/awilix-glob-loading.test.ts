import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Accepted-risk guard for GHSA-fc5q-39xc-vjpf (picomatch ReDoS), see issue #101 and
 * `scripts/ci/audit-exceptions.json`.
 *
 * `awilix` pulls `fast-glob` → `micromatch` → `picomatch` and uses them only for
 * filename globbing in `loadModules()` / `listModules()`. The dependency audit accepts
 * that advisory because this repo registers every binding explicitly. If anything starts
 * globbing through awilix, this test fails and the exception no longer holds.
 */
const GLOB_LOADING = /\b(?:loadModules|listModules)\b/;
const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const SCANNED_DIRECTORIES = ['packages', 'scripts', 'tests'];
const SKIPPED_DIRECTORIES = new Set(['node_modules', '.next', 'dist', 'coverage', 'storybook-static']);
const SOURCE_FILE = /\.(?:[cm]?[jt]sx?)$/;

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
}

function usesGlobLoading(source: string): boolean {
  return GLOB_LOADING.test(stripComments(source));
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return SKIPPED_DIRECTORIES.has(entry.name) ? [] : sourceFiles(path);
    return SOURCE_FILE.test(entry.name) ? [path] : [];
  });
}

describe('awilix glob loading stays unused', () => {
  it('detects calls, destructured imports and method access', () => {
    expect(usesGlobLoading('container.loadModules(["a/*.ts"])')).toBe(true);
    expect(usesGlobLoading("import { listModules } from 'awilix';")).toBe(true);
    expect(usesGlobLoading('const { loadModules } = container;')).toBe(true);
  });

  it('ignores mentions in comments', () => {
    expect(usesGlobLoading('// no loadModules here\nconst a = 1;')).toBe(false);
    expect(usesGlobLoading('/** no `loadModules` globbing */\nconst a = 1;')).toBe(false);
    expect(usesGlobLoading('asClass(Service).singleton()')).toBe(false);
  });

  it('is not used anywhere in packages, scripts or tests', () => {
    const self = fileURLToPath(import.meta.url);
    const files = SCANNED_DIRECTORIES.flatMap((name) => sourceFiles(join(ROOT, name)));
    // Guards against a wrong ROOT silently scanning nothing.
    expect(files.some((path) => path.endsWith('container.ts'))).toBe(true);
    const offenders = files.filter((path) => path !== self && usesGlobLoading(readFileSync(path, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
