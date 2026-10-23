import Link from "next/link";

// Public frontend pages use plain Tailwind utilities — no @mentio/ui (shadcn) components.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-8 px-6 py-24">
      <p className="text-sm font-medium tracking-widest text-neutral-500 uppercase">Mentio</p>
      <h1 className="text-4xl font-semibold tracking-tight text-balance text-neutral-900 sm:text-5xl">
        Welcome to Mentio.
      </h1>
      <p className="max-w-xl text-lg text-pretty text-neutral-600">
        This is the public frontend. Build customer-facing pages here with Tailwind CSS; the
        admin area lives under <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-base">/admin</code>.
      </p>
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
        >
          Open admin
        </Link>
      </div>
    </main>
  );
}
