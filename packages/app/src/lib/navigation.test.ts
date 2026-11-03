// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { navigation } from './navigation';

describe('navigation.assign', () => {
  it('drives window.location — observable in jsdom through a same-document hash change', () => {
    navigation.assign('#signed-out');
    expect(window.location.hash).toBe('#signed-out');
  });
});
