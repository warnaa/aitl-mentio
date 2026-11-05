import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { StackTags } from './stack-tags';

const db = new URL('../../../../db/', import.meta.url);

/** Every `array['a','b']::text[]` literal in a source file, as lists of values. */
function checkLiterals(path: string): string[][] {
  const source = readFileSync(new URL(path, db), 'utf8');
  return [...source.matchAll(/array\[([^\]]*)\]::text\[\]/g)].map(([, list]) =>
    list!.split(',').map((value) => value.trim().replace(/^'|'$/g, '')),
  );
}

describe('StackTags', () => {
  it('labels every value of the closed set', () => {
    expect(StackTags.options).toEqual([
      { value: 'typescript', label: 'TypeScript' },
      { value: 'react', label: 'React' },
      { value: 'python', label: 'Python' },
      { value: 'ai-agents', label: 'AI agents' },
    ]);
  });

  // db is the leaf package and cannot import this vocabulary, so its CHECK constraints
  // carry a hand-written copy (B25). Changing one side without the other fails here.
  it.each([
    'src/entities/invitations/invitation.entity.ts',
    'migrations/Migration20261104000100_invitations.ts',
  ])('matches the stack_tags CHECK literal in %s', (path) => {
    const literals = checkLiterals(path);
    expect(literals.length).toBeGreaterThan(0);
    for (const literal of literals) expect(literal).toEqual([...StackTags.values]);
  });
});
