import type { Metadata } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "DevMentor",
  description: "Connect developers with mentors.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  // Render every page per request: Next stamps the nonce from the proxy's
  // Content-Security-Policy on its scripts only while rendering, so prerendered HTML
  // would carry nonce-less scripts the policy blocks (`lib/content-security-policy`).
  await connection();
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
