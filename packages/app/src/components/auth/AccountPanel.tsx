'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { AccountForm, Button } from '@devmentor/ui';
import { AuthLayout } from '@devmentor/ui/backend';
import { loginSchema } from '@devmentor/core/validators/auth/login.schema';
import { registerSchema } from '@devmentor/core/validators/auth/register.schema';
import { navigation } from '../../lib/navigation';

export interface AccountPanelProps {
  mode: 'sign-in' | 'register';
  /** The page's `AuthLayout` heading, description and back link (prototype s12, s20). */
  title: string;
  description: string;
  footer?: ReactNode;
  /** Where to go after signing in; already sanitised by the page, re-checked by the route. */
  returnTo?: string;
  /** The GitHub start route, with `returnTo` (`githubSignInHref`). */
  githubHref: string;
  /** The other mode's page, with `returnTo` (`authPageHref`). */
  switchHref: string;
  notice?: ReactNode;
}

/**
 * The email-and-GitHub screens of `/sign-in` and `/register` (E01 #32): the design
 * system's `AuthLayout` around its `AccountForm` — GitHub first, then the email form
 * through `CrudForm` — wired to the routes. A signed-in result reloads the page
 * (`navigation.assign`) so the server renders the new session; a registration turns the
 * screen into "Check your inbox" (prototype s21), from which the visitor can go back to
 * the form with the address kept. Server refusals (generic 401, 403 unverified, 409, 429,
 * 503) are shown by `CrudForm` with the route's own message.
 *
 * `CrudForm` submits only its fields, so the schema appends `returnTo` itself; the route
 * parses the same schema and sanitises it again.
 */
export function AccountPanel({ mode, title, description, footer, returnTo, githubHref, switchHref, notice }: AccountPanelProps) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [lastEmail, setLastEmail] = useState<string | null>(null);
  const registering = mode === 'register';
  const schema = useMemo(() => {
    const base = registering ? registerSchema : loginSchema;
    return base.transform((values) => (returnTo ? { ...values, returnTo } : values));
  }, [registering, returnTo]);

  if (sentTo) {
    return (
      <AuthLayout
        title="Check your inbox"
        description={`Use the verification link for ${sentTo} to finish creating your account.`}
        footer={
          <Button type="button" intent="neutral" appearance="ghost" onClick={() => navigation.assign(switchHref)}>
            Back to sign in
          </Button>
        }
      >
        <div className="dm-auth-stack">
          <p>{`We sent the link to ${sentTo}. It works for 24 hours.`}</p>
          <p>Until you verify your email, your account cannot open private pages.</p>
          <Button type="button" intent="neutral" appearance="stroke" onClick={() => setSentTo(null)}>
            Use a different email or request a new link
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={title} description={description} footer={footer}>
      <AccountForm
        mode={mode}
        schema={schema}
        endpoint={registering ? '/api/auth/register' : '/api/auth/login'}
        initialValues={lastEmail ? { email: lastEmail } : undefined}
        notice={notice}
        onGitHub={() => navigation.assign(githubHref)}
        onSwitchMode={() => navigation.assign(switchHref)}
        onSuccess={(data) => {
          if (registering) {
            const { email } = data as { email: string };
            setLastEmail(email);
            setSentTo(email);
          } else {
            navigation.assign((data as { redirectTo: string }).redirectTo);
          }
        }}
      />
    </AuthLayout>
  );
}
