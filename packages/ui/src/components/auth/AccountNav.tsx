import type { ComponentType, ReactNode } from "react";

export interface AccountNavLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
}

export interface AccountNavProps {
  brand: { href: string; label: string };
  navLabel: string;
  /** Optimistic hint from the cookie's presence only — never an authorization (accounts UI/UX). */
  signedIn: boolean;
  signIn: { href: string; label: string };
  signUp: { href: string; label: string };
  /** The app's client sign-out control (calls the logout API, then refreshes). */
  signOut?: ReactNode;
  linkComponent?: ComponentType<AccountNavLinkProps>;
}

function Anchor({ children, ...props }: AccountNavLinkProps) {
  return <a {...props}>{children}</a>;
}

/** Public header (`AccountNav`) for `(marketing)` and `(auth)`: brand and account links. */
export function AccountNav({ brand, navLabel, signedIn, signIn, signUp, signOut, linkComponent: LinkComponent = Anchor }: AccountNavProps) {
  return (
    <header className="mentio-site-header">
      <LinkComponent href={brand.href} className="mentio-site-brand">
        {brand.label}
      </LinkComponent>
      <nav aria-label={navLabel} className="mentio-site-nav">
        {signedIn ? (
          signOut
        ) : (
          <>
            <LinkComponent href={signIn.href} className="mentio-link">
              {signIn.label}
            </LinkComponent>
            <LinkComponent href={signUp.href} className="mentio-site-cta">
              {signUp.label}
            </LinkComponent>
          </>
        )}
      </nav>
    </header>
  );
}
