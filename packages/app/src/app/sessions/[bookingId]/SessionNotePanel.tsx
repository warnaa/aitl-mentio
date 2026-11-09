'use client';

import { useRef, useState } from 'react';
import type { NoteDto, NoteView, SessionDto } from '@devmentor/core';
import { noteDeclineSchema } from '@devmentor/core/validators/notes/note-decline.schema';
import { noteDraftSchema } from '@devmentor/core/validators/notes/note.schema';
import { Button, Card, NoteReview, VersionHistory } from '@devmentor/ui';
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
const STATUS_RANK: Record<NoteDto['status'], number> = { draft: 0, awaiting_approval: 1, approved: 2, declined: 2 };
const firstName = (name: string) => name.trim().split(/\s+/)[0]!;
const uiState = (status: NoteDto['status']) => status === 'awaiting_approval' ? 'awaiting-approval' : status;

/** Version/revision/status progression is the clock; a stale response can never reopen a sent editor. */
function newer(next: NoteDto | null, current: NoteDto | null): boolean {
  if (!next) return false;
  if (!current) return true;
  if (next.version !== current.version) return next.version > current.version;
  if (next.revision !== current.revision) return next.revision > current.revision;
  return STATUS_RANK[next.status] > STATUS_RANK[current.status];
}

type Model = { seen: NoteView | null; saved: NoteDto | null; base: NoteDto | null; history: NoteDto[]; dirty: boolean; localBody: string; formKey: number };

/** Moves to an accepted note. A new version retires the previous one into history unless the server sent its own. */
function advance(model: Model, note: NoteDto, history?: NoteDto[]): Model {
  const retired = model.saved && note.version > model.saved.version ? [model.saved, ...model.history] : model.history;
  return { ...model, saved: note, history: history ?? retired, ...(!model.dirty ? { base: note, formKey: model.formKey + 1 } : {}) };
}

export function SessionNotePanel({ bookingId, viewerRole, counterpartName, hasAnswer, initial, zone }: Props) {
  const [model, setModel] = useState<Model>(() => ({ seen: initial, saved: initial?.current ?? null, base: initial?.current ?? null, history: initial?.history ?? [], dirty: false, localBody: '', formKey: 0 }));
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initial ? null : 'The session note could not be loaded. Try again.');
  const [message, setMessage] = useState('');
  const [declining, setDeclining] = useState(false);
  const [redraftOf, setRedraftOf] = useState<number | null>(null);
  const generation = useRef(0);
  const pending = useRef(false);
  const path = `/api/notes/${bookingId}`;
  // Reconcile parent props during render, applying the same monotonic/dirty rules as reads.
  if (initial !== model.seen) {
    const next = initial?.current ?? null;
    setModel({ ...(next && newer(next, model.saved) ? advance(model, next, initial?.history) : model), seen: initial });
  }

  function acceptRead(note: NoteDto | null, history?: NoteDto[]) {
    setModel(current => {
      // Check dirty NOW, not when Refresh began. A dirty form keeps its original expectedRevision.
      if (note && newer(note, current.saved)) return advance(current, note, history);
      return history && note?.version === current.saved?.version ? { ...current, history } : current;
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
    else acceptRead(result.data.current, result.data.history);
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
    setModel(current => newer(current.saved, note) ? current : advance({ ...current, dirty: false }, note));
    setMessage('Session note saved. Review it before sending.');
  }
  async function send() {
    if (pending.current || !model.saved || (model.saved.status === 'draft' && model.dirty)) return;
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
  async function approve(version: number) {
    if (pending.current) return;
    begin();
    const result = await apiCall<NoteDto>(`${path}/approve`, { method: 'POST', body: { version } });
    pending.current = false;
    setBusy(false);
    if (!result.ok) setError(result.error.message);
    else {
      acceptRead(result.data);
      setMessage('Session note approved. It stays private.');
    }
  }
  function declined(note: NoteDto) {
    acceptRead(note);
    setDeclining(false);
    setMessage('Your requested changes were sent.');
  }
  function submitting(active: boolean) {
    if (active) begin();
    else { pending.current = false; setBusy(false); }
  }
  function startRedraft(current: NoteDto) {
    if (model.dirty && !window.confirm('Discard your unsaved edits and start from the declined note?')) return;
    setModel(state => ({ ...state, base: current, dirty: false, formKey: state.formKey + 1 }));
    setRedraftOf(current.version);
  }
  function reloadSaved() {
    if (!window.confirm('Discard your unsaved edits and load the saved session note?')) return;
    setModel(current => ({ ...current, base: current.saved, dirty: false, formKey: current.formKey + 1 }));
    setMessage('Saved draft loaded.');
  }

  const note = model.saved;
  const mentor = viewerRole === 'mentor';
  const first = firstName(counterpartName);
  const canEdit = mentor && hasAnswer && (!note || note.status === 'draft' || (note.status === 'declined' && redraftOf === note.version));
  const revising = canEdit && Boolean(note) && (note!.status === 'declined' || note!.version > 1);
  const canDecide = !mentor && note?.status === 'awaiting_approval';
  const conflict = model.dirty && newer(note, model.base);
  const schema = noteDraftSchema.extend({ expectedRevision: noteDraftSchema.shape.expectedRevision.default(model.base?.revision ?? null), expectedVersion: noteDraftSchema.shape.expectedVersion.default(model.base?.version ?? null) });
  if (!hasAnswer && !note && !mentor) return null;
  return <section className="dm-product-stack" aria-label="Private session note">
    {!hasAnswer && !note && <p className="dm-product-callout">Post the written answer before drafting a private session note.</p>}
    {error && <ErrorMessage message={error} action={<Button type="button" disabled={busy || loading} onClick={() => void refresh()}>Retry</Button>} />}
    {loading && <LoadingMessage message="Refreshing session note…" />}
    {canEdit && <Card className="dm-product-panel">
      <h2 className="dm-product-title">{revising ? `Respond to ${first}’s feedback` : 'Private session note'}</h2>
      <p className="dm-product-muted">{revising ? `Save the revised note, review it, then send it. ${first} needs to approve it, and it stays private.` : 'Save a draft, review it, then send the saved revision for approval. Only you and your mentee can read it.'}</p>
      <fieldset disabled={busy} className="min-w-0"
        onSubmitCapture={event => { if (pending.current) { event.preventDefault(); event.stopPropagation(); } }}
        onKeyDownCapture={event => { if (pending.current) event.stopPropagation(); }}
        onChange={event => { const value = (event.target as unknown as HTMLTextAreaElement).value; setModel(current => ({ ...current, dirty: true, localBody: value })); }}>
        <CrudForm key={model.formKey} schema={schema} fields={[{ name: 'body', label: revising ? 'Revised private note' : 'Session note', type: 'textarea', required: true }]}
          initialValues={{ body: model.base?.body ?? '' }} endpoint={path} method="PUT" submitLabel="Save draft"
          onSuccess={data => saved(data as NoteDto)} onSubmittingChange={submitting} />
      </fieldset>
    </Card>}
    {conflict && <div className="dm-product-callout" role="status">A newer saved session note exists. Your unsaved edits are kept. Refreshing the preview does not replace them.
      {note?.status === 'draft' ? <Button type="button" intent="neutral" appearance="stroke" disabled={busy} onClick={reloadSaved}>Reload saved draft</Button> : <p className="whitespace-pre-wrap [overflow-wrap:anywhere]" aria-label="Unsaved session note">{model.localBody}</p>}
    </div>}
    {note ? <NoteReview title="Private session note" version={note.version} state={uiState(note.status)}
      author={mentor ? 'you' : counterpartName} updatedLabel={note.decidedAt ? `${note.status === 'approved' ? 'Approved' : 'Changes requested'} ${formatInstant(note.decidedAt, zone)}` : `Saved ${formatInstant(note.updatedAt, zone)}`}
      declineComment={note.declineComment ?? undefined}
      body={<p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{note.body}</p>}
      actions={mentor && (note.status === 'draft' || note.status === 'awaiting_approval') ? <Button type="button" disabled={busy || (note.status === 'draft' && model.dirty)} onClick={() => void send()}>{note.status === 'draft' ? 'Send for approval' : 'Notify mentee'}</Button>
        : mentor && note.status === 'declined' && redraftOf !== note.version ? <Button type="button" disabled={busy} onClick={() => startRedraft(note)}>Redraft</Button>
        : canDecide && declining ? <CrudForm schema={noteDeclineSchema.extend({ version: noteDeclineSchema.shape.version.default(note.version) })} fields={[{ name: 'comment', label: `What should ${first} change?`, type: 'textarea', required: true, placeholder: 'Describe the missing context or correction.' }]}
          canSubmit={values => String(values.comment).trim().length > 0} endpoint={`${path}/decline`} submitLabel="Send requested changes" onCancel={() => setDeclining(false)} onSuccess={data => declined(data as NoteDto)} onSubmittingChange={submitting} />
        : canDecide ? <><Button type="button" intent="neutral" appearance="stroke" disabled={busy} onClick={() => setDeclining(true)}>Request changes</Button><Button type="button" disabled={busy} onClick={() => void approve(note.version)}>Approve the full note</Button></>
        : undefined} />
      : hasAnswer && !mentor && <EmptyState title="No session note yet" description="Your mentor can save a private note after the written answer." />}
    {note?.status === 'draft' && !mentor && <p role="status">The mentor has not sent this note for approval yet.</p>}
    {note?.status === 'awaiting_approval' && <p role="status">{mentor ? "Waiting for the mentee’s approval" : 'Awaiting your approval'}</p>}
    {note?.status === 'approved' && <p role="status">Private: kept by you and {first}; nothing is published.</p>}
    {note?.status === 'declined' && <p role="status">{mentor ? `${first} asked for changes. Redraft the note to send a new version.` : `You asked for changes. ${first} can send a new version.`}</p>}
    {model.history.length > 0 && <VersionHistory versions={model.history.map(item => ({ version: item.version, author: mentor ? 'You' : counterpartName, updatedAt: item.updatedAt, dateLabel: formatInstant(item.updatedAt, zone), state: uiState(item.status), detail: item.declineComment ? `Requested changes: ${item.declineComment}` : 'Replaced by a newer version.' }))} />}
    <div className="dm-product-actions"><Button type="button" intent="neutral" appearance="stroke" disabled={busy || loading} onClick={() => void refresh()}>Refresh note</Button></div>
    <p role="status" className="dm-product-caption">{message}</p>
  </section>;
}
