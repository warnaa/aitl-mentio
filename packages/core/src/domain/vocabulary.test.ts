import { describe, expect, it } from 'vitest';
import { defineVocabulary } from './vocabulary';
import { StackTags } from './vocabularies/stack-tags';

describe('vocabulary', () => {
  it('keeps options, labels and validation on one closed set', () => {
    const v = defineVocabulary(['a', 'b'], { a: 'Alpha', b: 'Beta' });
    expect(v.values).toEqual(['a', 'b']);
    expect(v.options).toEqual([
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ]);
    expect(v.label('b')).toBe('Beta');
    expect(v.labelOf('a')).toBe('Alpha');
    expect(v.labelOf('retired')).toBe('retired');
    expect(v.schema.parse('a')).toBe('a');
    expect(v.schema.safeParse('c').success).toBe(false);
    expect(StackTags.options.map((o) => o.label)).toEqual(['TypeScript', 'React', 'Python', 'AI agents']);
    expect(StackTags.values.every((value) => StackTags.schema.safeParse(value).success)).toBe(true);
  });
});
