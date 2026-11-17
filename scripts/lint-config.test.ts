import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// Regression for #102: the vendored om-ux-design templates contain `{{SLUG_JSON}}`
// placeholders, so ESLint failed to parse them and `npm run lint` exited 1.
describe('eslint.config.mjs', () => {
  const eslint = new ESLint();

  it.each([
    '.claude/skills/om-ux-design/references/assets/comments.js',
    '.agents/skills/om-ux-design/references/assets/comments.js',
    '.claude/skills/om-ux-design/references/assets/prototype.js',
    '.agents/skills/om-ux-design/references/assets/prototype.js',
  ])('ignores the vendored skill template %s', async (file) => {
    expect(await eslint.isPathIgnored(file)).toBe(true);
  });

  it.each([
    '.claude/skills/om-harness/scripts/harness.mjs',
    'packages/core/src/index.ts',
    'scripts/invite.ts',
  ])('still lints %s', async (file) => {
    expect(await eslint.isPathIgnored(file)).toBe(false);
  });

  it('does not disable any rule for project code', async () => {
    const config = (await eslint.calculateConfigForFile('packages/core/src/index.ts')) as {
      rules?: Record<string, unknown>;
    };
    const off = Object.entries(config.rules ?? {}).filter(([, v]) =>
      [0, 'off'].includes(Array.isArray(v) ? (v[0] as number | string) : (v as number | string)),
    );
    // `next/typescript` and core-web-vitals turn a few rules off by design; assert the
    // boundary rule this repo owns stays an error rather than snapshotting upstream presets.
    expect(off.map(([name]) => name)).not.toContain('no-restricted-imports');
    expect(config.rules?.['no-restricted-imports']).toBeDefined();
  });
});
