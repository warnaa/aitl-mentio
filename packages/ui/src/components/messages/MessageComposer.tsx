"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@mentio/ui/components/button";
import { Textarea } from "@mentio/ui/components/textarea";
import { FormField } from "../../backend/forms/FormField";
import type { ApiResult } from "../../backend/api/types";

export interface MessageComposerReply {
  /** Id of the answered message; a new id moves focus to the field. */
  id: string;
  /** e.g. "Replying to Alex". */
  heading: string;
  excerpt: string;
  /** e.g. "Cancel reply". */
  cancelLabel: string;
  onCancel: () => void;
}

export interface MessageComposerProps {
  /** Visible field label, e.g. "Your message". */
  label: string;
  /** e.g. how to paste code and the Ctrl+Enter shortcut. */
  description?: string;
  sendLabel: string;
  /** e.g. "Sending…". */
  pendingLabel: string;
  /** Shown when sending an empty message, e.g. "Write a message first". */
  emptyError: string;
  /** The message being answered (approved Q5); set by the screen when a message's Reply is chosen. */
  replyTo?: MessageComposerReply;
  /** Sends the trimmed text; the message appears only after the server confirms it. */
  onSend: (body: string) => Promise<ApiResult<unknown>>;
  onSent?: (data: unknown) => void;
}

/**
 * Writes one message in a text session (E04-S01). The text stays until the server confirms
 * it; a failure is shown under the field; a second send is blocked while one runs.
 */
export function MessageComposer({ label, description, sendLabel, pendingLabel, emptyError, replyTo, onSend, onSent }: MessageComposerProps) {
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const busy = useRef(false);
  const [body, setBody] = useState("");
  const [isPending, setIsPending] = useState(false);
  // An empty send marks the field invalid; a failed send keeps the text. Both are announced.
  const [error, setError] = useState<{ message: string; empty: boolean } | null>(null);
  const errorId = `${useId()}-error`;
  const replyId = replyTo?.id;
  const shownReplyId = useRef(replyId);

  // Choosing Reply on a message moves focus to the field, where the quote is announced.
  // A reply already set on the first render does not take focus from the page.
  useEffect(() => {
    if (replyId && replyId !== shownReplyId.current) fieldRef.current?.focus();
    shownReplyId.current = replyId;
  }, [replyId]);

  async function send() {
    if (busy.current) return;
    const text = body.trim();
    if (!text) {
      setError({ message: emptyError, empty: true });
      fieldRef.current?.focus();
      return;
    }
    busy.current = true;
    setIsPending(true);
    setError(null);
    const result = await onSend(text);
    busy.current = false;
    setIsPending(false);
    if (result.ok) {
      setBody("");
      onSent?.(result.data);
    } else {
      setError({ message: result.error.message, empty: false });
    }
    fieldRef.current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter adds a line (pasted code needs them); Ctrl+Enter or Cmd+Enter sends.
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void send();
    }
  }

  return (
    <form className="mentio-composer" noValidate onSubmit={handleSubmit}>
      {replyTo && (
        <div className="mentio-composer-reply">
          <div className="mentio-message-quote">
            <p className="mentio-message-quote-author">{replyTo.heading}</p>
            <p className="mentio-message-quote-excerpt">{replyTo.excerpt}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => { replyTo.onCancel(); fieldRef.current?.focus(); }}>{replyTo.cancelLabel}</Button>
        </div>
      )}
      <FormField label={label} description={replyTo ? [replyTo.heading, description].filter(Boolean).join(". ") : description} required>
        <Textarea ref={fieldRef} value={body} readOnly={isPending} aria-invalid={error?.empty || undefined} aria-describedby={error ? errorId : undefined}
          onChange={(event) => setBody(event.target.value)} onKeyDown={handleKeyDown} />
      </FormField>
      {error && <p id={errorId} role="alert" className="mentio-field-error">{error.message}</p>}
      <div className="mentio-crud-actions">
        <Button type="submit" aria-disabled={isPending || undefined} aria-busy={isPending || undefined}>{isPending ? pendingLabel : sendLabel}</Button>
      </div>
    </form>
  );
}
