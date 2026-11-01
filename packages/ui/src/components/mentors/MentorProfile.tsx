import { useId, type ComponentType } from "react";
import type { PublicLinkProps } from "./MentorDirectory";

export interface MentorProfileSlot {
  id: string;
  /** Formatted by the app, e.g. "18:00". */
  label: string;
  /** E02: the booking link; E01 slots are plain text. */
  href?: string;
}

export interface MentorProfileDay {
  /** Formatted by the app, e.g. "Thursday, 6 November". */
  label: string;
  slots: MentorProfileSlot[];
}

export interface MentorProfileProps {
  displayName: string;
  /** Plain text; line breaks are kept. */
  description: string;
  work: { heading: string; links: string[]; newTabLabel: string };
  /** `items` null when the mentor has no rate (R03: booking unavailable). */
  prices: { heading: string; items: string[] | null; unavailableText: string };
  slots: { heading: string; days: MentorProfileDay[]; emptyText: string; bookLabel?: string };
  /** N01: "Sessions take place in text only". */
  textOnlyNote: string;
  linkComponent?: ComponentType<PublicLinkProps>;
}

function Anchor({ children, ...props }: PublicLinkProps) {
  return <a {...props}>{children}</a>;
}

/**
 * Public mentor page body (`/mentorzy/<slug>`), in the E01 spec's order: name,
 * description, public work, prices, slots by day, the text-only line. N02: no ratings.
 */
export function MentorProfile({ displayName, description, work, prices, slots, textOnlyNote, linkComponent: LinkComponent = Anchor }: MentorProfileProps) {
  // Generated ids: two instances on one page (or a docs page) never share heading ids. useId is server-safe.
  const uid = useId();
  return (
    <article className="mentio-public-page" aria-labelledby={`${uid}-name`}>
      <h1 id={`${uid}-name`} className="mentio-public-title">
        {displayName}
      </h1>
      <p className="mentio-profile-description">{description}</p>

      <section className="mentio-profile-section" aria-labelledby={`${uid}-work`}>
        <h2 id={`${uid}-work`} className="mentio-public-heading">
          {work.heading}
        </h2>
        <ul className="mentio-profile-work">
          {work.links.map((url) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noopener noreferrer nofollow ugc" className="mentio-link mentio-profile-url">
                {url}
                <span className="sr-only"> ({work.newTabLabel})</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mentio-profile-section" aria-labelledby={`${uid}-prices`}>
        <h2 id={`${uid}-prices`} className="mentio-public-heading">
          {prices.heading}
        </h2>
        {prices.items ? (
          <ul className="mentio-profile-prices">
            {prices.items.map((price) => (
              <li key={price}>{price}</li>
            ))}
          </ul>
        ) : (
          <p>{prices.unavailableText}</p>
        )}
      </section>

      <section className="mentio-profile-section" aria-labelledby={`${uid}-slots`}>
        <h2 id={`${uid}-slots`} className="mentio-public-heading">
          {slots.heading}
        </h2>
        {slots.days.length === 0 ? (
          <p>{slots.emptyText}</p>
        ) : (
          // A day groups slot links under its h3; it is not a landmark (14 days would add 14 regions).
          slots.days.map((day) => (
            <section key={day.label} className="mentio-profile-day">
              <h3 className="mentio-profile-day-label">{day.label}</h3>
              <ul className="mentio-profile-slots">
                {day.slots.map((slot) => (
                  <li key={slot.id}>
                    {slot.href ? (
                      <LinkComponent href={slot.href} className="mentio-link">
                        {slot.label}
                        {slots.bookLabel && <span> — {slots.bookLabel}</span>}
                        <span className="sr-only">, {day.label}</span>
                      </LinkComponent>
                    ) : (
                      <span className="mentio-profile-slot-time">{slot.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </section>

      <p className="mentio-profile-note">{textOnlyNote}</p>
    </article>
  );
}
