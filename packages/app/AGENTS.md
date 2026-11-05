<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## App conventions

`@devmentor/app` is the Next.js 16 App Router/Turbopack + React 19 host and
composition root; it may import every workspace package.

- `npm run dev` starts this app. `npm run build` / `npm run start` force
  `NODE_ENV=production` for production build / serve.
- Touch the database only in dynamic routes/pages with
  `export const dynamic = "force-dynamic"`. Degrade gracefully: the app must build
  and boot without a reachable database.
- `next.config.ts` loads the root `.env` through `src/lib/repo-env.ts`
  (`process.loadEnvFile`); Next would otherwise read only this package's directory.

## Routes and pages

- Reuse core's validation, auth, error and CRUD layers. Plain CRUD routes use
  `makeCrudRoute`; workflow routes use `apiHandler`. Never hand-roll a bare
  `try/catch` plus `NextResponse.json`. Read `packages/core/AGENTS.md` for helper
  contracts and guards.
- Browser-navigated routes (GitHub OAuth start/callback, email verification)
  catch failures and redirect, typically to `/sign-in?error=…`, so JSON never
  renders as a page. Other callers use `apiCall` and the JSON envelope.
- Mutations are JSON-only and must go through `apiCall` or `CrudForm`, never a
  native HTML form post; core's `apiHandler` enforces the CSRF header.
- Signed-in layouts AND every `page.tsx` call `requirePageRole`/
  `requirePageAccount` from `src/lib/session.ts`; layouts do not re-run on client
  navigation. The service checks the session again.
- `src/proxy.ts` only forwards the path as `x-devmentor-path` so signed-out deep
  links survive sign-in; it is not an auth boundary. Add each new signed-in
  surface to its `matcher` or deep links fall back to the section root.
- For new concepts, copy the existing examples in
  `src/app/api/users/route.ts` and `src/app/admin/users/page.tsx`.

## Surfaces and navigation

| Surface | Routes | Styling |
| --- | --- | --- |
| Public | Landing, mentor share links, invitations, `(auth)/*` | `PublicLayout` (`components/public/PublicPage`) or `AuthLayout` with `dm-*` classes from `@devmentor/ui` |
| App | `(mentee)/*`, `(mentor)/*` | shadcn through `@devmentor/ui`, inside `AppShell` |
| Admin | `/admin/*` | shadcn through `@devmentor/ui`, inside `AppShell` |

- Every app/admin layout renders `SignedInShell` from `src/components/auth/`,
  with `AppShell` and `WorkspaceNav`.
- Add existing signed-in pages to `src/lib/nav.ts` for the union of the user's
  roles. Never add nonexistent pages or role-granting links: mentors are invited,
  operators are configured (R07).
- Read `packages/ui/AGENTS.md` and its linked guidelines before composing UI;
  use its shared API, forms, tables, feedback and component-placement rules.
- A page with a prototype screen (`prototypes/devmentor-journey/`, mapped in the
  story's design handoff) reproduces that screen's composition: sections, order,
  headings and the DS components it uses. Behaviour specs govern data, copy facts
  and bounds. Compare desktop and 320px screenshots with the prototype before done.
