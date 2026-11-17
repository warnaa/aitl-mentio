import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { integrationArtifactsDirectory } from '../../tests/integration/agent-browser';

// Issue #54: the integration writer, the CI evidence upload and the ignore rules must
// agree on one generated directory under `.ai/qa/`, or evidence silently goes missing.
const root = resolve(import.meta.dirname, '../..');
const expectedDirectory = '.ai/qa/integration';

function isIgnored(path: string): boolean {
  const result = spawnSync('git', ['check-ignore', '--quiet', '--no-index', path], { cwd: root });
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`git check-ignore failed for ${path}: ${String(result.stderr)}`);
  }
  return result.status === 0;
}

describe('integration artifact location', () => {
  it('writes every integration artifact under .ai/qa/integration', () => {
    expect(relative(root, integrationArtifactsDirectory).replaceAll('\\', '/')).toBe(expectedDirectory);
  });

  it('uploads the same directory as CI evidence', () => {
    const workflow = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8');
    const uploadStep = workflow.split('- name: Upload integration evidence')[1]?.split(/\r?\n\r?\n/)[0];

    expect(uploadStep).toBeDefined();
    expect(uploadStep).toMatch(/if: always\(\)/);
    expect(uploadStep).toMatch(new RegExp(`path: ${expectedDirectory.replaceAll('.', '\\.')}/\\s`));
    expect(workflow).not.toContain('test-results/integration');
  });

  it('ignores generated output while keeping curated QA reports tracked', () => {
    expect(isIgnored(`${expectedDirectory}/app.log`)).toBe(true);
    expect(isIgnored(`${expectedDirectory}/agent-browser/home-1.stdout.txt`)).toBe(true);
    expect(isIgnored('.ai/qa/AUTH/AUTH-010-sign-in-mentee-to-home.md')).toBe(false);
  });
});
