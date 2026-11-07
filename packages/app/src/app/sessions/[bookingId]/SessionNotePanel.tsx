'use client';

import { useRef, useState } from 'react';
import type { NoteDto, NoteView, SessionDto } from '@devmentor/core';
import { noteDraftSchema } from '@devmentor/core/validators/notes/note.schema';
import { Button, Card, NoteReview } from '@devmentor/ui';
import { apiCall, CrudForm, EmptyState, ErrorMessage, LoadingMessage } from '@devmentor/ui/backend';
import { formatInstant } from '@devmentor/ui/time';

interface Props {
  bookingId: string;
  viewerRole: SessionDto['viewerRole'];
  counterpartName: string;
  hasAnswer: boolean;
  initial: NoteView | null;
  zone: string;
}
/** Version/revision/status progression is the clock; a stale response can never reopen a sent editor. */
function newer(next: NoteDto | null, current: NoteDto | null): boolean {
  if (!next) return false;
  if (!current) return true;
  if (next.version !== current.version) return next.version > current.version;
  if (next.revision !== current.revision) return next.revision > current.revision;
  return next.status === 'awaiting_approval' && current.status === 'draft';
}

export function SessionNotePanel({ bookingId, viewerRole, counterpartName, hasAnswer, initial, zone }: Props) {
  const [model, setModel] = useState(() => ({ seen: initial, saved: initial?.current ?? null, base: initial?.current ?? null, dirty: false, localBody: '', formKey: 0 }));
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initial ? null : 'The session note could not be loaded. Try again.');
  const [message, setMessage] = useState('');
  const generation = useRef(0);
  const pending = useRef(false);
  const path = `/api/notes/${bookingId}`;
  // Reconcile parent props during render, applying the same monotonic/dirty rules as reads.
  if (initial !== model.seen) {
    const next = initial?.current ?? null;
    const advance = newer(next, model.saved);
    setModel({ ...model, seen: initial, ...(advance ? { saved: next, ...(!model.dirty ? { base: next, formKey: model.formKey + 1 } : {}) } : {}) });
  }

  function acceptRead(note: NoteDto | null) {
    setModel(current => {
      if (!newer(note, current.saved)) return current;
      // Check dirty NOW, not when Refresh began. A dirty form keeps its original expectedRevision.
      return { ...current, saved: note, ...(!current.dirty ? { base: note, formKey: current.formKey + 1 } : {}) };
    });
  }
  async function refresh() {
    if (pending.current) return;
    const request = ++generation.current;
    setLoading(true);
    setError(null);
    const result = await apiCall<NoteView>(path, { cache: 'no-store' });
    if (request !== generation.current) return;
    setLoading(false);
    if (!result.ok) setError(result.error.message);
    else acceptRead(result.data.current);
  }
  function begin() {
    pending.current = true;
    generation.current += 1;
    setLoading(false);
    setBusy(true);
    setError(null);
    setMessage('');
  }
  function saved(note: NoteDto) {
    setModel(current => newer(current.saved, note) ? current : ({ ...current, saved: note, base: note, dirty: false, formKey: current.formKey + 1 }));
    setMessage('Session note saved. Review it before sending.');
  }
  async function send() {
    if (pending.current || model.dirty || !model.saved) return;
    begin();
    const result = await apiCall<NoteDto>(`${path}/send`, { method: 'POST', body: { version: model.saved.version, revision: model.saved.revision } });
    pending.current = false;
    setBusy(false);
    if (!result.ok) setError(result.error.message);
    else {
      acceptRead(result.data);
      setMessage('Notification requested.');
    }
  }
  function reloadSaved() {
    if (!window.confirm('Discard your unsaved edits and load the saved session note?')) return;
    setModel(current => ({ ...current, base: current.saved, dirty: false, formKey: current.formKey + 1 }));
    setMessage('Saved draft loaded.');
  }

  const note = model.saved;
  const mentor = viewerRole === 'mentor';
  const canEdit = mentor && hasAnswer && (!note || note.status === 'draft');
  const conflict = model.dirty && newer(note, model.base);
  const schema = noteDraftSchema.extend({ expectedRevision: noteDraftSchema.shape.expectedRevision.default(model.base?.revision ?? null) });
  if (!hasAnswer && !note && !mentor) return null;
  return <section className="dm-product-stack" aria-label="Private session note">
    {!hasAnswer && !note && <p className="dm-product-callout">Post the written answer before drafting a private session note.</p>}
    {error && <ErrorMessage message={error} action={<Button type="button" disabled={busy || loading} onClick={() => void refresh()}>Retry</Button>} />}
    {loading && <LoadingMessage message="Refreshing session note…" />}
    {canEdit && <Card className="dm-product-panel">
      <h2 className="dm-product-title">Private session note</h2>
      <p className="dm-product-muted">Save a draft, review it, then send the saved revision for approval. Only you and your mentee can read it.</p>
      <fieldset disabled={busy} className="min-w-0" onChange={event => { const value = (event.target as unknown as HTMLTextAreaElement).value; setModel(current => ({ ...current, dirty: true, localBody: value })); }}>
        <CrudForm key={model.formKey} schema={schema} fields={[{ name: 'body', label: 'Session note', type: 'textarea', required: true }]}
          initialValues={{ body: model.base?.body ?? '' }} endpoint={path} method="PUT" submitLabel="Save draft"
          onSuccess={data => saved(data as NoteDto)} onSubmittingChange={submitting => { if (submitting) begin(); else { pending.current = false; setBusy(false); } }} />
      </fieldset>
    </Card>}
    {conflict && <div className="dm-product-callout" role="status">A newer saved session note exists. Your unsaved edits are kept. Refreshing the preview does not replace them.
      {note?.status === 'draft' ? <Button type="button" intent="neutral" appearance="stroke" disabled={busy} onClick={reloadSaved}>Reload saved draft</Button> : <p className="whitespace-pre-wrap [overflow-wrap:anywhere]" aria-label="Unsaved session note">{model.localBody}</p>}
    </div>}
    {note ? <NoteReview title="Private session note" version={note.version} state={note.status === 'awaiting_approval' ? 'awaiting-approval' : note.status}
      author={mentor ? 'you' : counterpartName} updatedLabel={`Saved ${formatInstant(note.updatedAt, zone)}`}
      body={<p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{note.body}</p>}
      actions={mentor && (note.status === 'draft' || note.status === 'awaiting_approval') ? <Button type="button" disabled={busy || model.dirty} onClick={() => void send()}>{note.status === 'draft' ? 'Send for approval' : 'Notify mentee'}</Button> : undefined} />
      : hasAnswer && !mentor && <EmptyState title="No session note yet" description="Your mentor can save a private note after the written answer." />}
    {note?.status === 'draft' && !mentor && <p role="status">The mentor has not sent this note for approval yet.</p>}
    {note?.status === 'awaiting_approval' && <p role="status">{mentor ? "Waiting for the mentee’s approval" : 'Awaiting your approval'}</p>}
    <div className="dm-product-actions"><Button type="button" intent="neutral" appearance="stroke" disabled={busy || loading} onClick={() => void refresh()}>Refresh note</Button></div>
    <p role="status" className="dm-product-caption">{message}</p>
  </section>;
}

