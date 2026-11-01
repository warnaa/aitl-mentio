import type { ReactNode } from 'react';
import { PanelShell } from '@mentio/ui/backend/layout';
import { Button } from '@mentio/ui/components/button';

// Documentation helpers (not exported from the package): the real PanelShell with the navigation
// that E03–E05 screen stories share. “My sessions” and “Earnings” and their routes were decided by the user
// on 2026-11-01; no E03–E05 spec names them yet. Kept out of *.stories.tsx, where every export becomes a story.
export function MentorShell({ current, children }: { current: string; children: ReactNode }) {
  return <PanelShell title="Mentio — mentor" homeHref="#/mentor/strona" navLabel="Mentor" skipLabel="Skip to content" currentHref={current}
    items={[{ href: '#/mentor/strona', label: 'My page' }, { href: '#/mentor/terminy', label: 'My slots' }, { href: '#/mentor/sesje', label: 'My sessions' }, { href: '#/mentor/zarobki', label: 'Earnings' }]}
    actions={<Button type="button" variant="ghost" size="sm">Sign out</Button>}>{children}</PanelShell>;
}

export function MenteeShell({ children }: { children: ReactNode }) {
  return <PanelShell title="Mentio" homeHref="#/rezerwacje" navLabel="Bookings" skipLabel="Skip to content" currentHref="#/rezerwacje"
    items={[{ href: '#/rezerwacje', label: 'My bookings' }]} actions={<Button type="button" variant="ghost" size="sm">Sign out</Button>}>{children}</PanelShell>;
}

export const Stack = ({ children }: { children: ReactNode }) => <div className="flex flex-col gap-between-groups">{children}</div>;
