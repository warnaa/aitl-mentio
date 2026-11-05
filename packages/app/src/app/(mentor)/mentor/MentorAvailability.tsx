'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { CrudForm, DataTable, WorkflowAction, useApiResource } from '@devmentor/ui/backend';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@devmentor/ui/components/alert-dialog';
import { Badge } from '@devmentor/ui/components/badge';
import { Button } from '@devmentor/ui/components/button';
import { Card } from '@devmentor/ui/components/card';
import { LocalTime } from '@devmentor/ui/time';
import { slotCreateSchema } from '@devmentor/core/validators/availability/slot-create.schema';

const subscribe = () => () => {};
const viewerZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverZone = () => 'UTC';
const LEAD_TIME_MS = 2 * 60 * 60 * 1000;

type Slot = { id: string; startsAt: string };
type SlotPage = { items: Slot[]; page: number; pageCount: number };

/** The owner's paged slot list, shared by the add-time and times cards. */
export function useMentorSlots() {
  const [past, setPast] = useState(false);
  const [page, setPage] = useState(1);
  const resource = useApiResource<SlotPage>(`/api/availability/slots?past=${String(past)}&page=${String(page)}`);
  // Starts move past the two-hour notice and into the past while the page stays open.
  useEffect(() => { const timer = setInterval(resource.reload, 60_000); return () => clearInterval(timer); }, [resource.reload]);
  return { resource, past, setPage, togglePast: () => { setPage(1); setPast(value => !value); } };
}
export type MentorSlots = ReturnType<typeof useMentorSlots>;

export function AddTimeCard({ onPublished }: { onPublished: () => void }) {
  const zone = useSyncExternalStore(subscribe, viewerZone, serverZone);
  const [published, setPublished] = useState(false);
  return <Card className="dm-product-panel" id="mentor-time">
    <div><h2>Add an available time</h2><p className="dm-product-muted">Enter the start in your local time ({zone}). Mentees see it in their own timezone.</p></div>
    <CrudForm schema={slotCreateSchema} fields={[{ name: 'startsAt', label: 'Session starts at', type: 'datetime', required: true, description: 'Mentees can book a time up to two hours before it starts.' }]}
      endpoint="/api/availability/slots" submitLabel="Publish available time" onSuccess={() => { setPublished(true); onPublished(); }} />
    {published && <p role="status" className="dm-product-callout">Your time is published.</p>}
  </Card>;
}

function slotStatus(startsAt: string, past: boolean) {
  if (past) return 'Past';
  return Date.parse(startsAt) - Date.now() >= LEAD_TIME_MS ? 'Open' : 'Less than two hours away';
}

function RemoveTime({ slot, onRemoved }: { slot: Slot; onRemoved: () => void }) {
  const [open, setOpen] = useState(false);
  return <AlertDialog open={open} onOpenChange={setOpen}>
    <AlertDialogTrigger asChild><Button intent="error" appearance="ghost" size="sm">Remove time</Button></AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove this available time?</AlertDialogTitle>
        <AlertDialogDescription><LocalTime value={slot.startsAt} /> will disappear from your public profile. You can publish it again later.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Keep time</AlertDialogCancel>
        <WorkflowAction intent="error" endpoint={`/api/availability/slots/${slot.id}`} method="DELETE" label="Remove time" pendingLabel="Removing…"
          onSuccess={() => { setOpen(false); onRemoved(); }} />
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

export function TimesCard({ slots, onRemoved }: { slots: MentorSlots; onRemoved: () => void }) {
  const { resource, past } = slots;
  const [removed, setRemoved] = useState(false);
  return <Card className="dm-product-panel">
    <div><h2>Your available times</h2><p className="dm-product-muted">Times are shown in your local timezone.</p></div>
    <div className="dm-product-actions">
      <Button intent="neutral" appearance="stroke" size="sm" aria-pressed={past} onClick={slots.togglePast}>{past ? 'Hide past times' : 'Show past times'}</Button>
    </div>
    <DataTable caption="Your available times" rows={resource.data?.items} loading={resource.loading} error={resource.error} onRetry={resource.reload}
      getRowId={slot => slot.id} emptyMessage={past ? 'No past times.' : 'No published times yet.'}
      pagination={resource.data ? { page: resource.data.page, pageCount: resource.data.pageCount, onPageChange: slots.setPage } : undefined}
      columns={[
        { key: 'startsAt', header: 'Start', render: slot => <LocalTime value={slot.startsAt} /> },
        { key: 'status', header: 'Status', render: slot => <Badge variant="outline">{slotStatus(slot.startsAt, past)}</Badge> },
      ]}
      rowActions={past ? undefined : slot => <RemoveTime slot={slot} onRemoved={() => { setRemoved(true); onRemoved(); }} />} />
    {removed && <p role="status" className="dm-product-callout">Your time was removed.</p>}
  </Card>;
}
