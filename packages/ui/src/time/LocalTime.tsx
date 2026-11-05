'use client';

import { useSyncExternalStore } from 'react';
import { formatInstant } from './formatInstant';

const subscribe = () => () => {};
const viewerZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverZone = () => 'UTC';

/** The viewer's timezone: UTC on the server and first client render, then the browser's. */
export function useViewerTimeZone(): string {
  return useSyncExternalStore(subscribe, viewerZone, serverZone);
}

/** UTC on the server and first client render; viewer time only after hydration. */
export function LocalTime({ value }: { value: string }) {
  const zone = useViewerTimeZone();
  return <time dateTime={value}>{formatInstant(value, zone)}</time>;
}
