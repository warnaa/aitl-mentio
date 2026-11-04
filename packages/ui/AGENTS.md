# UI

`@devmentor/ui` owns presentational shadcn primitives and Tailwind tokens.
It imports neither core nor db.
Read `.storybook/Guidelines.mdx` before composing screens; it is the canonical
reference for the user-approved visual, content and accessibility rules.

## Component homes

- Shadcn primitive: `src/components/ui/`. Never hand-write it; run
  `npx shadcn@latest add <c>` from this package using its committed `components.json`.
- Generic, concept-agnostic panel pattern: `src/backend/<category>/`.
- Concept-specific component: `src/components/<concept>/`, using the same concept
  folder name as db/core.
- A component used by exactly one page stays next to that `page.tsx` until it has
  a second consumer.

## Shared backend UI

- `src/backend/api/apiCall.ts` is the only sanctioned client `fetch()` call site.
  Consumers use `apiCall`/`apiCallOrThrow`, forms use `forms/CrudForm.tsx`, lists
  use `tables/DataTable.tsx`, and states use
  `feedback/{LoadingMessage,ErrorMessage,EmptyState}.tsx` under `src/backend/`.
- Declare matching `{ ok, data }` / `{ ok, error }` types in `src/backend/api`
  independently of core's HTTP types; ui must not import core.
- `AppShell` knows neither `Role` nor `next/link`; the app supplies rendered links.

## Design contract

Use the guidelines for right-aligned form footers (secondary before primary,
including mobile wrapping), full-width auth actions with neutral providers and
separate back navigation, reading widths and spacing, neutral fact chips with
explicit units/currency, and labelled decorative technology icons.

The same guidelines define generous homepage feature chips with semibold blue
labels, direct specific copy in the current UI language, no inline dot metadata
separators, DM Mono for the wordmark and Inter for UI text. Preserve product facts
and validation/recovery instructions. The blue four-point star is the favicon.
Mentor ratings and reviews are presentational DS components; their persistence
and eligibility belong to the backend.

## Catalogue and prototype commands

Run from the repository root:

- `npm run storybook` / `npm run build-storybook`: rebuild the prototype and start
  / build the component catalogue.
- `npm run typecheck:storybook`: check catalogue configuration and examples.
- `npm run prototype`: rebuild the preview from `prototypes/devmentor-journey/`.
- `npm run typecheck:prototype` / `npm run test:prototype`: check prototype types
  and regressions. See the root router for the prototype README and workflow skill.
