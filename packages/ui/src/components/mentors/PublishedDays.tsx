'use client';

import { useViewerTimeZone } from '../../time/LocalTime';
import { Badge } from '../ui/badge';

const weekday = (value: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone }).format(new Date(value));

/** One neutral chip per weekday that has a published time, in the viewer's timezone. */
export function PublishedDays({ startsAt }: { startsAt: string[] }) {
  const zone = useViewerTimeZone();
  const days = [...new Set([...startsAt].sort().map(value => weekday(value, zone)))];
  return <div className="dm-fact-chips" role="group" aria-label="Days with published sessions">
    {days.map(day => <Badge key={day} variant="outline">{day}</Badge>)}
  </div>;
}
