import { useId, type ReactNode } from "react";

export interface AuthPanelProps {
  title: string;
  description?: string;
  /** Usually a CrudForm (accounts UI/UX). */
  children: ReactNode;
  /** Links to the other auth page, keeping `returnTo`. */
  footer?: ReactNode;
}

/** Sign-in, registration and become-a-mentor page body: one column, start-aligned. */
export function AuthPanel({ title, description, children, footer }: AuthPanelProps) {
  // Generated ids: two instances on one page (or a docs page) never share heading ids. useId is server-safe.
  const uid = useId();
  return (
    <main className="mentio-auth" aria-labelledby={`${uid}-title`}>
      <h1 id={`${uid}-title`} className="mentio-public-title">
        {title}
      </h1>
      {description && <p className="mentio-public-lead">{description}</p>}
      {children}
      {footer && <div className="mentio-auth-footer">{footer}</div>}
    </main>
  );
}
