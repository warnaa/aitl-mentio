import type { ReactNode } from "react";
import Link from "next/link";
import { SignOutButton } from "../../components/auth/SignOutButton";
import { requirePageRole } from "../../lib/session";

// Reads the session cookie and the database on every request.
export const dynamic = "force-dynamic";

/**
 * Admin/backend shell. Pages under `/admin` use shadcn-ui components from
 * `@devmentor/ui`. This layout provides the persistent nav.
 *
 * Operators only: it guards before rendering anything, and every page under it guards
 * again, because a layout does not re-run on client-side navigation (edge case 21).
 * The layout cannot see the path, so a signed-out visitor returns to `/admin`.
 */
const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requirePageRole("operator", "/admin");
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-border bg-card p-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          DevMentor
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">Admin</p>
        <nav className="mt-8 flex flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8">
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
