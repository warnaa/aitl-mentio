'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { SessionDto } from '@devmentor/core';
import { messageCreateSchema } from '@devmentor/core/validators/sessions/message-create.schema';
import { SessionHeader, SessionIsTextNotice, SessionTranscript, ShareRuleNotice, WrittenAnswer, type SessionMessage } from '@devmentor/ui';
import { apiCall, CrudForm } from '@devmentor/ui/backend';
import { formatInstant, useViewerTimeZone } from '@devmentor/ui/time';

/** How often an open tab asks for new messages. */
export const POLL_MS = 5000;
const HEADER_STATE = { not_started: 'upcoming', open: 'open', ended: 'ended' } as const;

function firstName(name: string) {
  return name.trim().split(/\s+/)[0]!;
}

/**
 * The text session screen (prototype s7). The server decides the window; this component
 * only shows it, polls for new messages while the tab is visible and the session is not
 * over, and posts through `CrudForm`. The two notices stay outside the polled region, so
 * neither disappears while loading or after an error.
 */
export function SessionRoom({ initial }: { initial: SessionDto }) {
  const [data, setData] = useState(initial);
  const [stale, setStale] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [refused, setRefused] = useState(false);
  const succeeded = useRef(false);
  const zone = useViewerTimeZone();
  const path = `/api/sessions/${initial.booking.id}`;
  const ended = data.window === 'ended';

  /** `afterFailedPost`: when the session turns out to have ended, say the draft missed it (set in the same update, so the composer never unmounts). */
  const refresh = useCallback(async (afterFailedPost = false) => {
    const result = await apiCall<SessionDto>(path);
    if (!result.ok) {
      setStale(true);
      return;
    }
    setData(result.data);
    setStale(false);
    if (afterFailedPost && result.data.window === 'ended') setRefused(true);
  }, [path]);

  useEffect(() => {
    if (ended) return;
    const poll = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const timer = setInterval(poll, POLL_MS);
    document.addEventListener('visibilitychange', poll);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [ended, refresh]);

  const counterpart = firstName(data.counterpartName);
  const timeFormat = new Intl.DateTimeFormat('en-GB', { timeStyle: 'short', timeZone: zone });
  const messages: SessionMessage[] = data.messages.map(message => ({
    id: message.id,
    author: message.authorName,
    isOwn: message.isOwn,
    sentAt: message.createdAt,
    timeLabel: timeFormat.format(new Date(message.createdAt)),
    body: <span className="whitespace-pre-wrap break-words">{message.body}</span>,
    delivery: 'sent',
  }));

  const form = (
    <div>
      <CrudForm
        key={sentCount}
        schema={messageCreateSchema}
        fields={[{ name: 'body', label: `Message to ${counterpart}`, type: 'textarea', required: true, placeholder: 'Write a message or paste a code example...' }]}
        endpoint={`${path}/messages`}
        submitLabel="Send message"
        onSuccess={() => { succeeded.current = true; setRefused(false); setSentCount(count => count + 1); }}
        onSubmittingChange={submitting => {
          if (submitting) { succeeded.current = false; return; }
          void refresh(!succeeded.current);
        }}
      />
      <p className="dm-product-caption">Enter for a new line. Ctrl or ⌘ + Enter to send.</p>
      {sentCount > 0 && <span className="sr-only" role="status">Message sent.</span>}
    </div>
  );

  // One stable tree: the form keeps its position, so a draft survives the window closing under it.
  const composer = (
    <div className="dm-product-stack">
      {data.window === 'not_started' && <p className="dm-product-callout" role="status">You can write here when the session starts, {formatInstant(data.booking.startsAt, zone)}.</p>}
      {ended && (
        <div role="status">
          <h2 className="dm-product-title">This session has ended</h2>
          <p>{refused ? 'This session ended before your message was sent. Your draft is kept below so you can copy it.' : 'You can still read the conversation above.'}</p>
        </div>
      )}
      {(data.window === 'open' || (ended && refused)) && form}
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
      {data.truncated && <p className="dm-product-caption">Earlier messages are not shown.</p>}
      <SessionTranscript messages={messages} composer={composer} />
      {ended && <WrittenAnswer state="owed" mentorName={data.viewerRole === 'mentee' ? data.counterpartName : 'you'} body={null} />}
    </div>
  );
}
