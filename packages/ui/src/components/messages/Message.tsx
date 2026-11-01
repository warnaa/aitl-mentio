import { Fragment, useId, type ReactNode } from "react";
import { Button } from "@mentio/ui/components/button";

export interface MessageReplySource {
  /** Author of the message being answered, e.g. "Alex". */
  author: string;
  /** A short excerpt, cut by the app, e.g. the first line. */
  excerpt: string;
  /** In-page link to the source message, e.g. "#message-3". */
  href: string;
  /** e.g. "Go to Alex’s message". */
  goToLabel: string;
}

export interface MessageProps {
  /** DOM id: the target of reply links. */
  id: string;
  author: string;
  /** e.g. "Mentor", "Mentee", "Question sent with the booking". */
  role?: string;
  /** ISO timestamp for `<time dateTime>`. */
  dateTime: string;
  /** Formatted by the app, e.g. "18:04". */
  time: string;
  /** Plain text; fenced ``` blocks and `inline code` use the code role (R01.2). */
  body: string;
  /** Show the whole body in the code role, as the question is shown in E02. */
  preformatted?: boolean;
  /** The message this one answers (R02.2, approved Q5: inline quoted source). */
  replyTo?: MessageReplySource;
  /** Omitted in a read-only transcript. */
  reply?: { label: string; onReply: () => void };
}

const FENCE = /```[^\n`]*\n?([\s\S]*?)```/g;
const INLINE_CODE = /`([^`\n]+)`/g;

function inline(text: string): ReactNode[] {
  return text.split(INLINE_CODE).map((part, index) => (index % 2 === 1 ? <code key={index} className="mentio-message-inline-code">{part}</code> : <Fragment key={index}>{part}</Fragment>));
}

/** Splits a body into text paragraphs and fenced code blocks; an unclosed fence stays text. */
function renderBody(body: string): ReactNode[] {
  return body.split(FENCE).flatMap((part, index) => {
    if (index % 2 === 1) return [<pre key={index} className="mentio-message-code"><code>{part.replace(/\n$/, "")}</code></pre>];
    const text = part.replace(/^\n+|\n+$/g, "");
    return text ? [<p key={index} className="mentio-message-text">{inline(text)}</p>] : [];
  });
}

/**
 * One message in a text session (E04-S01): author and time (R02.3), the answered message
 * as an inline quote with a link back (R02.2), and code in the code role (R01.2).
 */
export function Message({ id, author, role, dateTime, time, body, preformatted = false, replyTo, reply }: MessageProps) {
  const uid = useId();
  // Separate ids, so the name reads "Alex Mentor 18:04" (accessible names join referenced ids with spaces).
  const meta = [`${uid}-author`, role ? `${uid}-role` : undefined, `${uid}-time`].filter(Boolean).join(" ");
  return (
    <article id={id} tabIndex={-1} className="mentio-message" aria-labelledby={meta}>
      <p className="mentio-message-meta">
        <span id={`${uid}-author`} className="mentio-message-author">{author}</span>
        {role && <span id={`${uid}-role`}>{role}</span>}
        <time id={`${uid}-time`} dateTime={dateTime}>{time}</time>
      </p>
      {replyTo && (
        <div className="mentio-message-quote">
          <p className="mentio-message-quote-author">{replyTo.author}</p>
          <p className="mentio-message-quote-excerpt">{replyTo.excerpt}</p>
          <a className="mentio-link" href={replyTo.href}>{replyTo.goToLabel}</a>
        </div>
      )}
      <div className="mentio-message-body">
        {preformatted ? <p className="mentio-message-text mentio-message-preformatted">{body}</p> : renderBody(body)}
      </div>
      {reply && (
        <div>
          <Button type="button" variant="ghost" size="sm" aria-describedby={meta} onClick={reply.onReply}>{reply.label}</Button>
        </div>
      )}
    </article>
  );
}
