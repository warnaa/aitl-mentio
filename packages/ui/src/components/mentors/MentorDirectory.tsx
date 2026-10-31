import type { ComponentType, ReactNode } from "react";

export interface PublicLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  rel?: string;
}

export interface MentorDirectoryItem {
  href: string;
  displayName: string;
  /** First 200 characters of the description (E01). */
  excerpt: string;
  /** Formatted by the app, e.g. "25 min — 120 zł" or "No rate yet". */
  priceLabel: string;
  /** Formatted by the app, e.g. "Next slot: Thursday, 6 November, 18:00" or "No slots to book". */
  availabilityLabel: string;
}

export interface MentorDirectoryPagination {
  navLabel: string;
  /** e.g. "Page 2 of 3". */
  label: string;
  previousHref?: string;
  nextHref?: string;
  previousLabel: string;
  nextLabel: string;
}

export interface MentorDirectoryProps {
  heading: string;
  intro?: string;
  items: MentorDirectoryItem[];
  emptyText: string;
  pagination?: MentorDirectoryPagination;
  /** The app passes `next/link`; defaults to a plain anchor. */
  linkComponent?: ComponentType<PublicLinkProps>;
}

function Anchor({ children, ...props }: PublicLinkProps) {
  return <a {...props}>{children}</a>;
}

/**
 * Public mentor list body (`/mentorzy`). R01.1/R01.3: dense rows with thin separators;
 * N02: no ratings. Server-safe plain markup: all copy and formatted values are props.
 */
export function MentorDirectory({ heading, intro, items, emptyText, pagination, linkComponent: LinkComponent = Anchor }: MentorDirectoryProps) {
  return (
    <section className="mentio-public-page" aria-labelledby="mentor-directory-heading">
      <h1 id="mentor-directory-heading" className="mentio-public-title">
        {heading}
      </h1>
      {intro && <p className="mentio-public-lead">{intro}</p>}
      {items.length === 0 ? (
        <p className="mentio-public-empty">{emptyText}</p>
      ) : (
        <ul className="mentio-directory">
          {items.map((item) => (
            <li key={item.href} className="mentio-directory-item">
              <h2 className="mentio-directory-name">
                <LinkComponent href={item.href} className="mentio-link">
                  {item.displayName}
                </LinkComponent>
              </h2>
              <p className="mentio-directory-excerpt">{item.excerpt}</p>
              <p className="mentio-directory-meta">
                <span>{item.priceLabel}</span>
                <span>{item.availabilityLabel}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
      {pagination && (
        <nav aria-label={pagination.navLabel} className="mentio-public-pagination">
          {pagination.previousHref ? (
            <LinkComponent href={pagination.previousHref} className="mentio-link" rel="prev">
              {pagination.previousLabel}
            </LinkComponent>
          ) : (
            <span aria-hidden="true" />
          )}
          <span>{pagination.label}</span>
          {pagination.nextHref ? (
            <LinkComponent href={pagination.nextHref} className="mentio-link" rel="next">
              {pagination.nextLabel}
            </LinkComponent>
          ) : (
            <span aria-hidden="true" />
          )}
        </nav>
      )}
    </section>
  );
}
