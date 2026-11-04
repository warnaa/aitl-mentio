# Testing

These requirements also apply to colocated package tests. Run commands from the
repository root; `vitest.config.mts` and `.github/workflows/ci.yml` are the
authoritative runner configuration and CI commands.

## Unit coverage

- Every new feature must cover 100% of new or changed production behavior per
  file: statements, branches, functions and lines. A feature is incomplete and its
  spec cannot move to `implemented/` until `npm run test:unit:coverage` proves it.
- Add each new or changed production file to `coverage.include` in
  `vitest.config.mts` in the same change. Do not narrow exclusions or remove files
  to pass the gate; measuring only files imported by tests can bypass coverage.
- Unit tests live beside source as `*.test.ts` / `*.test.tsx`. Cover success,
  error, validation, authorization and edge-case branches. Every bug fix needs a
  regression test that fails without the fix.
- `npm run test:unit` runs Vitest; `npm run test:unit:coverage` enforces the
  per-file 100% gate.

## Component tests

- Keep `environment: 'node'` and `@vitejs/plugin-react` in `vitest.config.mts`.
- Invoke async server components (`page.tsx`, `layout.tsx`) directly and assert
  the returned element tree in node, without a DOM or renderer.
- Client tests opt in with `// @vitest-environment jsdom` and use
  `@testing-library/react` plus `@testing-library/user-event`.
- `redirect()` throws. Guarded-page tests mock `app/src/lib/session.ts`, assert
  the allowed tree and a denied sentinel throw. `session.test.ts` mocks
  `next/navigation` and checks redirect arguments, never Next internals.
  Include every guarded `page.tsx` in coverage and test authorized and redirected
  branches.

## Integration and CI

- Add integration coverage when behavior crosses the app/database/API/browser
  boundary. Browser/integration tests supplement, never replace, unit coverage.
- Read `tests/integration/AGENTS.md` before running or changing those scenarios.
- CI runs Build, Lint, Unit tests and Integration tests independently on each PR.
  They become merge-blocking only when a repository ruleset requires those exact
  four check names.
