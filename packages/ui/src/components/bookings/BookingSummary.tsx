import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@mentio/ui/components/card";
import { StatusBadge, type StatusTone } from "@mentio/ui/backend/feedback";

export interface BookingFact {
  /** e.g. "Time", "Length", "Price". */
  term: string;
  /** Formatted by the app, e.g. "Thursday, 6 November, 18:00 (Warsaw time)" or "240 zł". */
  detail: ReactNode;
}

export interface BookingSummaryProps {
  /** e.g. "Booking with Alex". */
  title: string;
  /** Heading level for the page outline; the details page uses its own h1. */
  headingLevel?: 1 | 2;
  /** The concept map (F6) supplies tone and label. */
  status?: { tone: StatusTone; label: string };
  facts: BookingFact[];
  /** The full question, kept as typed (pasted code keeps its line breaks). */
  question?: { heading: string; text: string };
  /** N01: "The session takes place in text only — there is no video call." */
  textOnlyNote: string;
}

/**
 * The booking at a glance on the new-booking, payment and details screens
 * (book-and-pay UI/UX): status, mentor, time, length, price, question, N01.
 */
export function BookingSummary({ title, headingLevel = 2, status, facts, question, textOnlyNote }: BookingSummaryProps) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  // The question heading is one level below the title, so the outline never skips a level.
  const QuestionHeading = headingLevel === 1 ? "h2" : "h3";
  return (
    <Card>
      <CardHeader>
        <div className="mentio-status-heading">
          <CardTitle>
            <Heading>{title}</Heading>
          </CardTitle>
          {status && <StatusBadge tone={status.tone} label={status.label} />}
        </div>
      </CardHeader>
      <CardContent className="mentio-booking-body">
        <dl className="mentio-booking-facts">
          {facts.map((fact) => (
            <div key={fact.term} className="mentio-booking-fact">
              <dt>{fact.term}</dt>
              <dd>{fact.detail}</dd>
            </div>
          ))}
        </dl>
        {question && (
          <section className="mentio-booking-question" aria-label={question.heading}>
            <QuestionHeading className="mentio-label">{question.heading}</QuestionHeading>
            <p className="mentio-booking-question-text">{question.text}</p>
          </section>
        )}
        <p className="mentio-field-description">{textOnlyNote}</p>
      </CardContent>
    </Card>
  );
}
