// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { apiCall } from './apiCall';
import { useApiResource } from './useApiResource';

vi.mock('./apiCall', () => ({ apiCall: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

type Result = Awaited<ReturnType<typeof apiCall>>;

/** Each call returns a promise the test settles by hand, in call order. */
function deferredCalls() {
  const pending: Array<(result: Result) => void> = [];
  vi.mocked(apiCall).mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
  return { settle: (index: number, result: Result) => act(async () => pending[index]!(result)) };
}

const signal = (index: number) => vi.mocked(apiCall).mock.calls[index]![1]!.signal!;

it('loads a resource, then keeps its data while a reload is in flight', async () => {
  const calls = deferredCalls();
  const { result } = renderHook(() => useApiResource<{ id: number }>('/one'));
  expect(result.current).toMatchObject({ data: null, loading: true, error: null });
  expect(apiCall).toHaveBeenCalledWith('/one', { signal: expect.any(AbortSignal) });

  await calls.settle(0, { ok: true, data: { id: 1 } });
  expect(result.current).toMatchObject({ data: { id: 1 }, loading: false, error: null });

  act(() => result.current.reload());
  expect(result.current).toMatchObject({ data: { id: 1 }, loading: true });
  expect(signal(0).aborted).toBe(true);

  await calls.settle(1, { ok: true, data: { id: 2 } });
  expect(result.current).toMatchObject({ data: { id: 2 }, loading: false });
});

it('reports a failed request with no data', async () => {
  const calls = deferredCalls();
  const { result } = renderHook(() => useApiResource('/one'));
  await calls.settle(0, { ok: false, error: { code: 'down', message: 'Unavailable' } });
  expect(result.current).toMatchObject({ data: null, loading: false, error: 'Unavailable' });
});

it('never shows an old path’s data under a new path', async () => {
  const calls = deferredCalls();
  const { result, rerender } = renderHook(({ path }) => useApiResource(path), { initialProps: { path: '/one' } });
  await calls.settle(0, { ok: true, data: 'one' });
  rerender({ path: '/two' });
  expect(result.current).toMatchObject({ data: null, loading: true });
  expect(signal(0).aborted).toBe(true);
  await calls.settle(1, { ok: true, data: 'two' });
  expect(result.current.data).toBe('two');
});

it('aborts on unmount and ignores a response arriving afterwards', async () => {
  const calls = deferredCalls();
  const { result, unmount } = renderHook(() => useApiResource('/slow'));
  unmount();
  expect(signal(0).aborted).toBe(true);
  await calls.settle(0, { ok: true, data: 'late' });
  await waitFor(() => expect(result.current.data).toBeNull());
});
