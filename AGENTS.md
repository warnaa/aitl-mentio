# DevMentor

Platform connecting developers with mentors. npm workspaces, Node ≥ 24,
TypeScript 5 strict and ESM. Run commands from the repository root.
Dependencies flow `app → core → db` and `app → ui`; only db may import `@mikro-orm/*`.
Package roles and framework details live in the unit instructions below.

## Hard rules

- Work locally. Obtain explicit approval before any remote write: pushes, PRs,
  issues, publishing/deployment, Figma or another external service. Read-only
  research is allowed; a request to build locally is not approval to publish.
- Keep run logs, local PR drafts, working references and generated previews out
  of commits. Review the staged list; commit only requested deliverables and their
  required source, tests and documentation.
- Plan first. If implementation goes sideways, stop and revise the plan/spec.
  For high-stakes plans, get a skeptical staff-engineer subagent review before coding.
- Before continuing after a user correction, record it in `.ai/lessons.md`;
  update the relevant instruction file for a standing rule.
- Propose a skill or command in `.claude/` when a multi-step task repeats more
  than a couple of times.
- Before declaring work done, check the diff against acceptance criteria and try
  to break it. If it is merely adequate, scrap it and implement the elegant version
  rather than iterating on a mediocre base. Report failures plainly; claim success
  only after verification.
- Delegate wide searches, multi-file reads and independent parallel work to
  subagents; keep conclusions in the main thread for judgment.

## Shared package conventions

- Ship TypeScript source via `exports` → `./src/*`; Next compiles it with
  `transpilePackages`. No per-package build step.
- Use extensionless relative imports inside packages (`./foo`, not `./foo.js`);
  Turbopack cannot rewrite `.js` to `.ts`.
- Repeat concept names across layers, never organize domain code in `modules/`:
  `packages/db/src/entities/<concept>/<name>.entity.ts`,
  `packages/core/src/services/<concept>/<name>.service.ts`,
  `packages/core/src/validators/<concept>/` for shared Zod schemas, and
  `packages/app/src/app/api/<concept>/route.ts` plus the persona's `page.tsx`.
  Create folders with their first file; no empty scaffolding, per-concept setup/ACL
  or auto-discovery. See the engineering-standards route for naming and ports.
- Use only the root `.env`, copied from `.env.example` without overwriting an
  existing file. Defaults match `docker-compose.yml` (`devmentor` for user, password
  and database). Real environment values win; ignore a missing `.env`.
- Under `packages/`, read env through core/db zod schemas, never direct
  `process.env`. Setup and integration exceptions live in their unit instructions.

## Specs, runs and lessons

- Check `.ai/lessons.md` at the start of related work.
- Before a nontrivial feature or fix, check `.ai/specs/` and
  `.ai/specs/implemented/` for coverage. If none exists, write a spec before
  implementation beyond a small/obvious change. Include Problem/Goal, Non-goals,
  Approach and Acceptance criteria.
- New specs live directly in `.ai/specs/`, named `YYYY-MM-DD-slug.md` for the
  date written and a short kebab-case slug. After completion, verification and
  merge, `git mv` to `implemented/`; move superseded, abandoned or inaccurate
  specs to `archive/` rather than deleting them. Never edit specs in either
  destination: changed requirements need a new spec.
- Every autonomous run produces exactly one local `.ai/runs/YYYY-MM-DD-slug.md`,
  dated the day of the run, recording request, work, files, outcome and follow-ups.
- `.ai/lessons.md` is a newest-first chronological index, one line per lesson.
  Keep short lessons inline; link longer ones to `.ai/lessons/slug.md`.
  Add a lesson for a nontrivial bug fix (cause, fix, prevention), a discovered
  project gotcha/convention or a user correction that should persist.
- Use these `.ai/` homes for specs, run logs and lessons, not ad hoc scratch docs.

## Task router

Read matching rows before acting, including each affected unit. Testing guidance
also applies to tests colocated with production code. Paths below are repo-relative
concrete files; use manifests and CI for the current commands.

| Task | Read |
| --- | --- |
| Bug fix | `.ai/lessons.md`, `CODE_REVIEW.md`, `tests/AGENTS.md` |
| New feature | `SDLC.md`, `.ai/specs/product-brief.md`, `.ai/specs/2026-09-01-engineering-standards.md`, `tests/AGENTS.md` |
| Refactor | `BACKWARD_COMPATIBILITY.md`, `.ai/specs/2026-09-01-engineering-standards.md`, `tests/AGENTS.md` |
| Review | `CODE_REVIEW.md`, `BACKWARD_COMPATIBILITY.md`, `tests/AGENTS.md` |
| Commands and local environment | `package.json`, `README.md`, `.env.example` |
| Configuration and env loading | `packages/app/AGENTS.md`, `packages/core/AGENTS.md`, `packages/db/AGENTS.md`, `scripts/setup/AGENTS.md` |
| Next.js app, routes and authentication | `packages/app/AGENTS.md` |
| Core services, HTTP helpers, DI and events | `packages/core/AGENTS.md` |
| Database, entities, migrations and seeders | `packages/db/AGENTS.md` |
| Shared UI and component placement | `packages/ui/AGENTS.md` |
| Screens, forms and visible copy | `packages/ui/AGENTS.md`, `packages/ui/.storybook/Guidelines.mdx` |
| API resources and CRUD pages | `packages/app/AGENTS.md`, `packages/core/AGENTS.md`, `packages/ui/AGENTS.md` |
| Setup installer | `scripts/setup/AGENTS.md` |
| Unit and component testing | `tests/AGENTS.md`, `vitest.config.mts` |
| Integration and browser testing | `tests/integration/AGENTS.md`, `vitest.integration.config.mts`, `.ai/browsers/agent-browser.md` |
| CI checks | `tests/AGENTS.md`, `.github/workflows/ci.yml` |
| Storybook catalogue | `packages/ui/AGENTS.md`, `packages/ui/.storybook/README.md` |
| Prototype flows and design handoff | `prototypes/devmentor-journey/README.md`, `.agents/skills/devmentor-prototype/SKILL.md` |
| Writing or reviewing a spec | `.agents/skills/om-spec-writing/SKILL.md` |
| Delivery pipeline | `SDLC.md`, `.ai/agentic.config.json` |
| Editing agent instructions | `.agents/skills/task-router/SKILL.md`, `scripts/check-agent-routes.mjs` |

Use `AGENTS.md` directly; `CLAUDE.md` wrappers are unnecessary.
Run `node scripts/check-agent-routes.mjs` after instruction changes. It checks
route targets and budgets (root ≤ 150 lines, unit ≤ 120).
