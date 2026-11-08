'use client';

import { useState } from 'react';
import type { SessionDto, WrittenAnswerDto } from '@devmentor/core';
import { answerUpdateSchema } from '@devmentor/core/validators/sessions/answer-update.schema';
import { Card, WrittenAnswer } from '@devmentor/ui';
import { CrudForm } from '@devmentor/ui/backend';
import { formatInstant } from '@devmentor/ui/time';

export interface WrittenAnswerPanelProps {
  session: Pick<SessionDto, 'booking' | 'window' | 'viewerRole' | 'counterpartName' | 'answer' | 'answerOwed' | 'answerFrozen'>;
  zone: string;
  /** Called with the saved answer so the screen shows it without waiting for a poll. */
  onSaved: (answer: WrittenAnswerDto) => void;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0]!;
}

/**
 * The written answer on the session screen (E04-S02). The mentee reads it, or learns it is
 * still owed once the session has ended. The booking's mentor writes and may replace it once
 * the session has started. The mentor's form keeps one position in the tree, so a draft
 * survives the session ending under it. Without unsaved edits it follows the latest saved answer
 * (another tab's save, or the server's trimmed copy of this one); with them it keeps the draft and
 * says that a newer answer exists, so an older text is never put back unnoticed.
 */
export function WrittenAnswerPanel({ session, zone, onSaved }: WrittenAnswerPanelProps) {
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { answer } = session;
  const latest = answer?.postedAt ?? 'none';
  const [formKey, setFormKey] = useState(latest);
  if (!dirty && formKey !== latest) setFormKey(latest);
  const posted = answer && (
    <WrittenAnswer
      state="posted"
      mentorName={session.viewerRole === 'mentor' ? 'you' : session.counterpartName}
      body={<span className="whitespace-pre-wrap break-words">{answer.body}</span>}
      publishedLabel={`Posted ${formatInstant(answer.postedAt, zone)}`}
    />
  );

  if (session.viewerRole === 'mentee') {
    if (posted) return posted;
    return session.answerOwed ? <WrittenAnswer state="owed" mentorName={session.counterpartName} body={null} owedMessage="The written answer is still owed." /> : null;
  }

  if (session.window === 'not_started') {
    return <WrittenAnswer state="owed" mentorName="you" body={null} owedMessage="You can post the written answer when the session starts." />;
  }

  const mentee = firstName(session.counterpartName);
  return (
    <div className="dm-product-stack">
      {session.answerFrozen && <p className="dm-product-callout" role="status">{mentee} approved the private session note, so this written answer is final.</p>}
      {/* Unsaved text stays on screen when an approval lands under it; the server refuses to save it. */}
      {(!session.answerFrozen || dirty) && <Card className="dm-product-panel">
        <h2 className="dm-product-title">Written answer for {mentee}</h2>
        <p className="dm-product-muted">{mentee} sees it on this page as soon as you post it.</p>
        <div onChange={() => setDirty(true)}>
        <CrudForm
          key={formKey}
          schema={answerUpdateSchema}
          fields={[{ name: 'body', label: 'Written answer', type: 'textarea', required: true }]}
          initialValues={{ body: answer?.body ?? '' }}
          endpoint={`/api/sessions/${session.booking.id}/answer`}
          method="PUT"
          submitLabel={answer ? 'Update written answer' : 'Post written answer'}
          onSuccess={data => { setSaved(true); setDirty(false); onSaved(data as WrittenAnswerDto); }}
          onSubmittingChange={submitting => { if (submitting) setSaved(false); }}
        />
        </div>
        {dirty && formKey !== latest && <p className="dm-product-callout" role="status">A newer written answer was saved, for example in another tab. Saving replaces it with the text above.</p>}
        <p className="dm-product-caption" role="status">{saved ? 'Written answer saved.' : ''}</p>
      </Card>}
      {posted}
    </div>
  );
}
