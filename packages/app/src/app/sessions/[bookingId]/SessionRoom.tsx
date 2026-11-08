'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { NoteView, SessionDto } from '@devmentor/core';
import { messageCreateSchema } from '@devmentor/core/validators/sessions/message-create.schema';
import { Label, SessionHeader, SessionIsTextNotice, SessionTranscript, ShareRuleNotice, Textarea, type SessionMessage } from '@devmentor/ui';
import { apiCall, CrudForm } from '@devmentor/ui/backend';
import { formatInstant, useViewerTimeZone } from '@devmentor/ui/time';
import { SessionNotePanel } from './SessionNotePanel';
import { WrittenAnswerPanel } from './WrittenAnswerPanel';

/** How often an open tab asks for new messages. */
export const POLL_MS = 5000;
const HEADER_STATE = { not_started: 'upcoming', open: 'open', ended: 'ended' } as const;
/** Answers that will not change by asking again: stop polling and say so. */
const EMPTY_NOTE: NoteView = { current: null, history: [] };
const PERMANENT = new Set(['unauthorized', 'not_found']);

function firstName(name: string) {
  return name.trim().split(/\s+/)[0]!;
}

/**
 * The text session screen (prototype s7). The server decides the window; this component
 * only shows it, polls for new messages while the tab is visible and the session is not
 * over, and posts through `CrudForm`. The two notices stay outside the polled region, so
 * neither disappears while loading or after an error.
 */
export function SessionRoom({ initial, initialNote = EMPTY_NOTE }: { initial: SessionDto; initialNote?: NoteView | null }) {
  const [data, setData] = useState(initial);
  const [stale, setStale] = useState(false);
  const [gone, setGone] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);
  const latest = useRef(0);
  const composer = useRef<HTMLDivElement>(null);
  const zone = useViewerTimeZone();
  const path = `/api/sessions/${initial.booking.id}`;
  const ended = data.window === 'ended';

  /** Only the newest request may change the screen, so a slow older answer never undoes a newer one. */
  const refresh = useCallback(async () => {
    const request = ++latest.current;
    const result = await apiCall<SessionDto>(path);
    if (request !== latest.current) return;
    if (!result.ok) {
      if (PERMANENT.has(result.error.code)) setGone(true);
      else setStale(true);
      return;
    }
    setData(result.data);
    setStale(false);
  }, [path]);

  useEffect(() => {
    if (ended || gone) return;
    const poll = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const timer = setInterval(poll, POLL_MS);
    document.addEventListener('visibilitychange', poll);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [ended, gone, refresh]);

  // After a post the form is remounted empty; put the cursor back where the next message goes.
  useEffect(() => {
    if (sentCount > 0) composer.current?.querySelector('textarea')?.focus();
  }, [sentCount]);

  const counterpart = firstName(data.counterpartName);
  const timeFormat = useMemo(() => new Intl.DateTimeFormat('en-GB', { timeStyle: 'short', timeZone: zone }), [zone]);
  const messages: SessionMessage[] = data.messages.map(message => ({
    id: message.id,
    author: message.authorName,
    isOwn: message.isOwn,
    sentAt: message.createdAt,
    timeLabel: timeFormat.format(new Date(message.createdAt)),
    body: <span className="whitespace-pre-wrap break-words">{message.body}</span>,
    delivery: 'sent',
  }));
  const label = `Message to ${counterpart}`;
  const placeholder = 'Write a message or paste a code example...';

  const form = (
    <div ref={composer} onChange={event => setHasDraft((event.target as unknown as { value: string }).value.length > 0)}>
      <CrudForm
        key={sentCount}
        schema={messageCreateSchema}
        fields={[{ name: 'body', label, type: 'textarea', required: true, placeholder }]}
        endpoint={`${path}/messages`}
        submitLabel="Send message"
        onSuccess={() => { setHasDraft(false); setSentCount(count => count + 1); }}
        onSubmittingChange={submitting => { if (!submitting) void refresh(); }}
      />
      <p className="dm-product-caption">Enter for a new line. Ctrl or ⌘ + Enter to send.</p>
      <span className="sr-only" role="status">{sentCount > 0 ? 'Message sent.' : ''}</span>
    </div>
  );

  // One stable tree: the form keeps its position, so an unsent draft survives the window closing under it.
  const body = (
    <div className="dm-product-stack">
      {data.window === 'not_started' && (
        <div className="dm-field">
          <Label htmlFor="session-composer-locked">{label}</Label>
          <Textarea id="session-composer-locked" className="w-full" disabled placeholder={placeholder} />
          <p className="dm-product-callout" role="status">You can write here when the session starts, {formatInstant(data.booking.startsAt, zone)}.</p>
        </div>
      )}
      {ended && (
        <div role="status">
          <h2 className="dm-product-title">This session has ended</h2>
          <p>{hasDraft ? 'This session ended before your message was sent. Your draft is kept below so you can copy it.' : 'You can still read the conversation above.'}</p>
        </div>
      )}
      {(data.window === 'open' || (ended && hasDraft)) && form}
    </div>
  );

  return (
    <div className="dm-product-stack">
      <nav aria-label="Back"><Link href={data.viewerRole === 'mentee' ? '/home' : '/mentor'}>My sessions</Link></nav>
      <SessionHeader
        title={`Session with ${data.counterpartName}`}
        state={HEADER_STATE[data.window]}
        participants={`${data.viewerRole === 'mentee' ? 'Your mentor' : 'Your mentee'}: ${data.counterpartName}`}
        schedule={`${formatInstant(data.booking.startsAt, zone)} · ${data.booking.lengthMinutes} minutes`}
        notice={`Only you and ${counterpart} can read this conversation.`}
      />
      <SessionIsTextNotice />
      <ShareRuleNotice />
      {stale && <p className="dm-product-caption" role="status">Reconnecting…</p>}
      {gone && <p className="dm-product-callout" role="alert">This session is no longer available. Reload the page or go back to My sessions.</p>}
      {data.truncated && <p className="dm-product-caption">Earlier messages are not shown.</p>}
      <SessionTranscript messages={messages} composer={body} />
      <WrittenAnswerPanel session={data} zone={zone} onSaved={answer => { setData(current => ({ ...current, answer, answerOwed: false })); void refresh(); }} />
      <SessionNotePanel bookingId={data.booking.id} viewerRole={data.viewerRole} counterpartName={data.counterpartName} hasAnswer={data.answer !== null} initial={initialNote} zone={zone} />
    </div>
  );
}
