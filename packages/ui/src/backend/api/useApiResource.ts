'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiCall } from './apiCall';

export interface ApiResource<T> {
  /** The latest data for this path; kept while a `reload` is in flight. */
  data: T | null;
  /** True until the current request settles, including during a `reload`. */
  loading: boolean;
  error: string | null;
  reload: () => void;
}

interface Settled<T> {
  path: string;
  revision: number;
  data: T | null;
  error: string | null;
}

/**
 * Loads one GET resource and aborts the request when the path changes, on reload and on
 * unmount. State is derived from which request a settled result belongs to, so a
 * response for an old path never shows under a new one.
 */
export function useApiResource<T>(path: string): ApiResource<T> {
  const [revision, setRevision] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    void apiCall<T>(path, { signal: controller.signal }).then((result) => {
      if (controller.signal.aborted) return;
      setSettled(
        result.ok
          ? { path, revision, data: result.data, error: null }
          : { path, revision, data: null, error: result.error.message },
      );
    });
    return () => controller.abort();
  }, [path, revision]);

  const samePath = settled?.path === path ? settled : null;
  const current = samePath?.revision === revision ? samePath : null;
  return { data: samePath?.data ?? null, loading: !current, error: current?.error ?? null, reload };
}
