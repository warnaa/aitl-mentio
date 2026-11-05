'use client';

import { useEffect, useState } from 'react';
import { CrudForm, DataTable, WorkflowAction, useApiResource } from '@devmentor/ui/backend';
import { Button } from '@devmentor/ui/components/button';
import { LocalTime } from '@devmentor/ui/time';
import { slotCreateSchema } from '@devmentor/core/validators/availability/slot-create.schema';

type Slot = { id: string; startsAt: string };
export function MentorSlots() {
  const resource = useApiResource<Slot[]>('/api/availability/slots');
  const [showPast, setShowPast] = useState(false);
  const [viewer, setViewer] = useState<{ zone: string; now: number } | null>(null);
  const [notice, setNotice] = useState('');
  useEffect(() => { setViewer({ zone: Intl.DateTimeFormat().resolvedOptions().timeZone, now: Date.now() }); }, []);
  const rows = resource.data?.filter(slot => showPast || new Date(slot.startsAt).getTime() > (viewer?.now ?? 0));
  return <main className="dm-page max-w-3xl space-y-8 p-6">
    <header><h1 className="text-2xl font-medium">Availability</h1><p className="mt-2 text-muted-foreground">Publish individual start times for your mentor page.</p></header>
    <section className="space-y-6" aria-label="Publish availability">
      <p>Enter your local time{viewer ? ` in ${viewer.zone}` : '; your timezone will appear when this page is ready'}. Visitors see times in their own timezone.</p>
      <CrudForm schema={slotCreateSchema} fields={[{ name: 'startsAt', label: 'Start time', type: 'datetime', required: true }]} endpoint="/api/availability/slots" submitLabel="Publish time" onSuccess={() => { setNotice('Your time is published.'); resource.reload(); }} />
    </section>
    {notice && <p role="status">{notice}</p>}
    <section className="space-y-6" aria-label="Published availability">
      <Button variant="outline" aria-pressed={showPast} onClick={() => setShowPast(value => !value)}>{showPast ? 'Hide past times' : 'Show past times'}</Button>
      <DataTable rows={rows} loading={resource.loading} error={resource.error} onRetry={resource.reload} getRowId={slot => slot.id} caption="Published times" emptyMessage="No published times yet." columns={[{ key: 'startsAt', header: 'Start time', render: slot => <LocalTime value={slot.startsAt} /> }]} rowActions={slot => <WorkflowAction endpoint={`/api/availability/slots/${slot.id}`} method="DELETE" label="Remove time" pendingLabel="Removing…" onSuccess={() => { setNotice('Your time was removed.'); resource.reload(); }} />} />
    </section>
  </main>;
}

