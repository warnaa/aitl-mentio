import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Separator } from "@mentio/ui/components/separator";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s · Mentio Admin",
  },
};

const navItems = [{ href: "/admin", label: "Dashboard" }];

// Admin ("backend") pages are built from @mentio/ui (shadcn/ui) components.
export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-dvh bg-muted/40">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="px-6 py-5">
          <Link href="/admin" className="text-base font-semibold tracking-tight">
            Mentio Admin
          </Link>
        </div>
        <Separator />
        <nav className="flex flex-col gap-1 p-3 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center border-b bg-background px-6">
          <Link href="/admin" className="font-semibold md:hidden">
            Mentio Admin
          </Link>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
