import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runRelease = vi.fn();
const createNodeEffects = vi.fn().mockReturnValue({ marker: 'effects' });

vi.mock('./release.mjs', () => ({ runRelease }));
vi.mock('./effects.mjs', () => ({ createNodeEffects }));

/**
 * The entry point is composition only, so it is verified with the two modules it
 * wires together mocked out: real effects reach `runRelease`, and a thrown error is
 * reported as an Actions annotation with a failing exit code.
 */
describe('release entry point', () => {
  let original;
  beforeEach(() => {
    original = process.exitCode;
    vi.resetModules();
    runRelease.mockReset();
  });
  afterEach(() => {
    process.exitCode = original;
    vi.restoreAllMocks();
  });

  it('runs the release with real effects and leaves the exit code alone', async () => {
    await import('./index.mjs');
    expect(runRelease).toHaveBeenCalledWith({ marker: 'effects' });
    expect(process.exitCode).toBe(original);
  });

  it('reports a failure as an error annotation and a non-zero exit code', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    runRelease.mockImplementation(() => {
      throw new Error('no changelog entry');
    });
    await import('./index.mjs');
    expect(error).toHaveBeenCalledWith('::error::no changelog entry');
    expect(process.exitCode).toBe(1);
  });
});
