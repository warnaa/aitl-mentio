import Link from "next/link";

// Public frontend pages use plain Tailwind utilities — no @mentio/ui (shadcn) components.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-8 px-6 py-24">
      <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">Mentio</p>
      <h1 className="text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl">
        Welcome to Mentio.
      </h1>
      <p className="max-w-xl text-lg text-pretty text-muted-foreground">
        This is the public frontend. Build customer-facing pages here with Tailwind CSS; the
        admin area lives under <code className="rounded bg-muted px-1.5 py-0.5 text-base">/admin</code>.
      </p>
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Open admin
        </Link>
      </div>
    </main>
  );
}
