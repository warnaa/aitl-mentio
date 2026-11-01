import type { ReactNode } from 'react';
import { Separator } from '@mentio/ui/components/separator';

// Documentation helper (not exported from the package). It mirrors the structure of the existing
// `packages/app/src/app/admin/layout.tsx`, which the task names as the reference, so the Users list is
// shown in its real frame. It is not PanelShell: `/admin` on PanelShell is out of scope (What is missing).
// Kept as the app has it, and listed in the decision ledger: the navigation is hidden below 768 px,
// there is no skip link and no current-page marker. Deviations: opaque `bg-background` instead of the
// app's translucent muted tint (decision 3: opaque surfaces) and token spacing where a token exists.
const navItems = [
  { href: '#/admin', label: 'Dashboard' },
  { href: '#/admin/users', label: 'Users' },
];

export function AdminFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="px-panel py-5">
          <a href="#/admin" className="text-base font-semibold tracking-tight">Mentio Admin</a>
        </div>
        <Separator />
        <nav className="flex flex-col gap-1 p-3 text-sm">
          {navItems.map(item => (
            <a key={item.href} href={item.href} className="rounded-md px-3 py-2 font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center border-b bg-background px-panel">
          <a href="#/admin" className="font-semibold md:hidden">Mentio Admin</a>
        </header>
        <main className="flex-1 p-panel">{children}</main>
      </div>
    </div>
  );
}
