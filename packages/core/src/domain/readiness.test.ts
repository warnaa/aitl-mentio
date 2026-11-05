import { describe, expect, it } from 'vitest';
import { defineReadiness } from './readiness';
import { ValidationError } from '../http/errors';
import { mentorPagePublishable } from '../services/mentors/readiness';

describe('readiness', () => {
  const gate = defineReadiness<{ a: boolean; b: boolean }>([
    { key: 'a', label: 'A required', test: (p) => p.a },
    { key: 'b', label: 'B required', test: (p) => p.b },
  ]);
  it('evaluates all, some, none and reports exactly the missing field keys', () => {
    expect(gate.evaluate({ a: true, b: true }).ready).toBe(true);
    expect(gate.evaluate({ a: false, b: false }).items.every((i) => !i.met)).toBe(true);
    expect(gate.evaluate({ a: true, b: false }).items).toEqual([
      { key: 'a', label: 'A required', met: true },
      { key: 'b', label: 'B required', met: false },
    ]);
    expect(() => gate.assert({ a: true, b: true })).not.toThrow();
    try {
      gate.assert({ a: true, b: false });
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).fieldErrors).toEqual({ b: ['B required'] });
    }
  });
  it('defines page requirements once for both service and client output', () => {
    expect(mentorPagePublishable.evaluate({ publicWorkUrl: null, bio: null }).ready).toBe(
      false,
    );
    expect(
      mentorPagePublishable.evaluate({
        publicWorkUrl: 'https://example.test',
        bio: ' ',
      }).ready,
    ).toBe(false);
    expect(
      mentorPagePublishable.evaluate({
        publicWorkUrl: 'https://example.test',
        bio: 'Experience',
      }).ready,
    ).toBe(true);
  });
});
