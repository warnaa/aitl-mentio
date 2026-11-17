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
});
