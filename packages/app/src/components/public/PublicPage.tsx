import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@devmentor/ui';
import { PublicLayout } from '@devmentor/ui/backend';
import { SignOutButton } from '../auth/SignOutButton';
import { currentSession } from '../../lib/auth-page';
import { homeFor } from '../../lib/session';

export interface PublicPageProps {
  children: ReactNode;
  /** Links placed before the account links, e.g. the homepage's section links. */
  leading?: ReactNode;
  /** The header's primary action, after the account links. */
  primary?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * The public frame (prototype `PublicPage`): the design system's `PublicLayout` with the
 * account links for whoever is visiting. Only pages that exist are linked. When the
 * session cannot be checked (database down) the visitor sees the signed-out links, as
 * on `/sign-in`; the header is not an authorization boundary.
 */
export async function PublicPage({ children, leading, primary, footer, className }: PublicPageProps) {
  const session = await currentSession();
  return (
    <PublicLayout
      className={className}
      footer={footer}
      navigation={
        <>
          {leading}
          {session ? (
            <>
              <Button asChild intent="neutral" appearance="ghost">
                <Link href={homeFor(session.roles)}>My workspace</Link>
              </Button>
              {!primary && <SignOutButton />}
            </>
          ) : primary ? (
            <Button asChild intent="neutral" appearance="ghost">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          ) : (
            <>
              <Button asChild intent="neutral" appearance="ghost">
                <Link href="/home">My sessions</Link>
              </Button>
              <Button asChild intent="neutral" appearance="stroke">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </>
          )}
          {primary}
        </>
      }
    >
      {children}
    </PublicLayout>
  );
}
