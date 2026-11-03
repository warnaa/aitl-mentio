'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { AccountForm, AuthFeedback, Button } from '@devmentor/ui';
import { loginSchema } from '@devmentor/core/validators/auth/login.schema';
import { registerSchema } from '@devmentor/core/validators/auth/register.schema';
import { navigation } from '../../lib/navigation';

export interface AccountPanelProps {
  mode: 'sign-in' | 'register';
  /** Where to go after signing in; already sanitised by the page, re-checked by the route. */
  returnTo?: string;
  /** The GitHub start route, with `returnTo` (`githubSignInHref`). */
  githubHref: string;
  /** The other mode's page, with `returnTo` (`authPageHref`). */
  switchHref: string;
  notice?: ReactNode;
}

/**
 * The email-and-GitHub panel of `/sign-in` and `/register` (E01 #32): the design
 * system's `AccountForm` — GitHub first, then the email form through `CrudForm` —
 * wired to the routes. A signed-in result reloads the page (`navigation.assign`) so the
 * server renders the new session; a registration shows "Check your inbox" in place of
 * the form. Server refusals (generic 401, 403 unverified, 409, 429, 503) are shown by
 * `CrudForm` with the route's own message.
 *
 * `CrudForm` submits only its fields, so the schema appends `returnTo` itself; the route
 * parses the same schema and sanitises it again.
 */
export function AccountPanel({ mode, returnTo, githubHref, switchHref, notice }: AccountPanelProps) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const registering = mode === 'register';
  const schema = useMemo(() => {
    const base = registering ? registerSchema : loginSchema;
    return base.transform((values) => (returnTo ? { ...values, returnTo } : values));
  }, [registering, returnTo]);

  if (sentTo) {
    return (
      <AuthFeedback
        state="check-inbox"
        detail={`We sent the link to ${sentTo}. It works for 24 hours.`}
        actions={
          <Button type="button" intent="neutral" appearance="stroke" onClick={() => navigation.assign(switchHref)}>
            Back to sign in
          </Button>
        }
      />
    );
  }

  return (
    <AccountForm
      mode={mode}
      schema={schema}
      endpoint={registering ? '/api/auth/register' : '/api/auth/login'}
      notice={notice}
      onGitHub={() => navigation.assign(githubHref)}
      onSwitchMode={() => navigation.assign(switchHref)}
      onSuccess={(data) => {
        if (registering) {
          setSentTo((data as { email: string }).email);
        } else {
          navigation.assign((data as { redirectTo: string }).redirectTo);
        }
      }}
    />
  );
}
