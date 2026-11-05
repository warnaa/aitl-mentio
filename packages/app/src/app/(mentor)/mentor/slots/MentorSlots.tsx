'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { CrudForm, DataTable, WorkflowAction, useApiResource } from '@devmentor/ui/backend';
import { Button } from '@devmentor/ui/components/button';
import { LocalTime } from '@devmentor/ui/time';
import { slotCreateSchema } from '@devmentor/core/validators/availability/slot-create.schema';

const subscribe = () => () => {};
const viewerZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverZone = () => 'UTC';

type Slot = { id: string; startsAt: string };
export function MentorSlots() {
  const [showPast, setShowPast] = useState(false);
  const [page, setPage] = useState(1);
  const resource = useApiResource<{ items: Slot[]; page: number; pageCount: number }>("/api/availability/slots?past=" + String(showPast) + "&page=" + String(page));
  const zone = useSyncExternalStore(subscribe, viewerZone, serverZone);

  const [notice, setNotice] = useState('');
  useEffect(() => { const timer = setInterval(resource.reload, 60_000); return () => clearInterval(timer); }, [resource.reload]);
  const rows = resource.data?.items;
  return <main className="dm-page max-w-3xl space-y-8 p-6">
    <header><h1 className="text-2xl font-medium">Availability</h1><p className="mt-2 text-muted-foreground">Publish individual start times for your mentor page.</p></header>
    <section className="space-y-6" aria-label="Publish availability">
      <p>Enter your local time in {zone}. Visitors see times in their own timezone.</p>
      <CrudForm schema={slotCreateSchema} fields={[{ name: 'startsAt', label: 'Start time', type: 'datetime', required: true }]} endpoint="/api/availability/slots" submitLabel="Publish time" onSuccess={() => { setNotice('Your time is published.'); resource.reload(); }} />
    </section>
    {notice && <p role="status">{notice}</p>}
    <section className="space-y-6" aria-label="Published availability">
      <Button variant="outline" aria-pressed={showPast} onClick={() => { setPage(1); setShowPast(value => !value); }}>{showPast ? 'Hide past times' : 'Show past times'}</Button>
      <DataTable pagination={resource.data ? { page: resource.data.page, pageCount: resource.data.pageCount, onPageChange: setPage } : undefined} rows={rows} loading={resource.loading} error={resource.error} onRetry={resource.reload} getRowId={slot => slot.id} caption="Published times" emptyMessage="No published times yet." columns={[{ key: 'startsAt', header: 'Start time', render: slot => <LocalTime value={slot.startsAt} /> }]} rowActions={slot => <WorkflowAction endpoint={`/api/availability/slots/${slot.id}`} method="DELETE" label="Remove time" pendingLabel="Removing…" onSuccess={() => { setNotice('Your time was removed.'); resource.reload(); }} />} />
    </section>
  </main>;
}



