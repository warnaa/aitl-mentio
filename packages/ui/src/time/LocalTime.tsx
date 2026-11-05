'use client';

import { useSyncExternalStore } from 'react';
import { formatInstant } from './formatInstant';

const subscribe = () => () => {};
const viewerZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverZone = () => 'UTC';

/** UTC on the server and first client render; viewer time only after hydration. */
export function LocalTime({ value }: { value: string }) {
  const zone = useSyncExternalStore(subscribe, viewerZone, serverZone);
  return <time dateTime={value}>{formatInstant(value, zone)}</time>;
}
