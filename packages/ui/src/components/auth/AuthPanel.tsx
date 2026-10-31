import type { ReactNode } from "react";

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
  return (
    <main className="mentio-auth" aria-labelledby="auth-title">
      <h1 id="auth-title" className="mentio-public-title">
        {title}
      </h1>
      {description && <p className="mentio-public-lead">{description}</p>}
      {children}
      {footer && <div className="mentio-auth-footer">{footer}</div>}
    </main>
  );
}
