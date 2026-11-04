# Task-router split

Date: 2026-11-04. Included in the local commit at the user's explicit request.

## Request and scope

Apply the task-router skill to the repository instructions: discover real units,
commands and references, replace the long root with a task router, move scoped
rules into unit instructions, and add a dependency-free route/budget checker.
The user subsequently clarified that agents read AGENTS.md directly, so skip all
CLAUDE.md wrappers. The user then requested committing the results and this run
log, excluding `scripts/agentsx/`. No remote writes, skill/spec edits or product
changes.

## Work and outcome

- Started from a clean working tree. Read the instruction hierarchy, lessons,
  manifests, CI, design guidelines, review/delivery docs and the prior approved
  no-op audit. Applied the eliminate-no-op taxonomy as supporting guidance;
  preserved the historical `no-op-report.md` and prior audit decisions.
- Delegated read-only route discovery and fidelity review under Working Rule 5.
  Restored explicit package boundaries identified by review.
- Root AGENTS.md went from 338 to 100 lines (70.4% reduction). This is relocation,
  not deletion of unique project rules; all eight instruction files total 345
  lines, including the routing table. Root budget is 150; each unit budget is 120.
- Added 21 task routes with 46 concrete file references. Root keeps universal
  safety/workflow, shared package conventions and SDD artifact rules.
- Removed existing root/app CLAUDE.md files and discarded proposed new wrappers
  following the user correction; recorded it in `.ai/lessons.md` and the router.
- Added `scripts/check-agent-routes.mjs`, using only Node built-ins. It discovers
  instruction files outside dependency/generated/skill installations, validates
  line budgets and concrete route targets, and requires the four standard tasks.
  It runs relative to its own location, independently of the current directory.

## Rule destinations

Line references are to the original 338-line root saved locally under
`/tmp/devmentor-task-router/AGENTS.before.md`.

| Original rules | Canonical destination |
| --- | --- |
| L7–35 stack and package roles/boundaries | Root: npm, Node, TypeScript/ESM and dependency graph. Each package AGENTS.md: its stack, responsibilities and explicit import restrictions. |
| L37–50 concept folders, naming, no scaffolding/setup/ACL/discovery | Root Shared package conventions, linked engineering-standards spec. |
| L51–54 typed event IDs, Cradle, in-process only | `packages/core/AGENTS.md`, Services and scope. |
| L56–67 server HTTP/error/auth/CRUD reuse and service DTOs | Core HTTP infrastructure and Services; app Routes and pages for required route helper usage. |
| L68–71 client API, forms, lists and feedback | `packages/ui/AGENTS.md`, Shared backend UI; app routes to those consumer requirements. |
| L73–81 primitive/generic/concept/page component homes and shadcn CLI | `packages/ui/AGENTS.md`, Component homes. |
| L83–84 independently declared envelope shapes, users examples | Core/UI HTTP/API contracts; `packages/app/AGENTS.md` points to the concrete users route/page examples. |
| L86–95 setup steps, idempotence, TCP/Compose precedence, injectable bootstrap | `scripts/setup/AGENTS.md`. |
| L96–98 app dev/build/start commands and production NODE_ENV | `packages/app/AGENTS.md`, App conventions. General typecheck/lint commands are routed to `package.json`/README; dependency enforcement remains in `eslint.config.mjs`. |
| L99–100 unit and coverage commands | `tests/AGENTS.md`. |
| L101–105 Storybook and prototype commands | `packages/ui/AGENTS.md`, Catalogue and prototype commands, plus root routes to their READMEs. |
| L106–109 integration and browser-install commands | `tests/integration/AGENTS.md`. |
| L110–113 database commands | `packages/db/AGENTS.md`. |
| L115–130 root env/defaults/precedence, zod, loaders, harness and setup exceptions | Root Shared package conventions; app/db loader rules; core/db schema locations; setup and integration AGENTS.md for their documented exceptions. |
| L134–137 source exports, no package build, extensionless imports | Root Shared package conventions. |
| L138–147 entity builders, relation thunks, schema singletons, connection/retry, persist/flush | `packages/db/AGENTS.md`; container HMR cache lives in core instructions. |
| L148–149 dynamic database access and graceful no-DB build/boot | `packages/app/AGENTS.md`, App conventions. |
| L150–162 three UI surfaces, shells, role-union navigation/invitation limits, rendered links | App Surfaces and navigation; UI owns the AppShell boundary. |
| L163–165 request scopes and cleanup | Core Services and scope. Clarified actual session-aware scope helpers after inspecting `container.ts`. |
| L166–167 optional collection params | Core HTTP infrastructure; wording now distinguishes dynamic path parameters from dynamic server rendering. |
| L168–171 browser redirects, passthrough Response, JSON API envelope | App browser-route usage, core Response passthrough and envelope contract. |
| L172–178 JSON-only mutations, CSRF header, payment-only opt-out | App mutation callers; core centralized enforcement and exception. |
| L179–182 page/layout/service guards, proxy forwarding/matcher | App Routes and pages. |
| L184–209 form order/auth width, spacing/type scale, facts/feature chips, copy, separators, fonts/favicon, technology labels, presentational reviews | UI Design contract and the existing `.storybook/Guidelines.mdx`, now explicitly canonical and routed before screen work. Missing humanizer reference handled below. |
| L211–234 four-metric 100% coverage, explicit includes, colocated regression tests, server/client/redirect testing | `tests/AGENTS.md`, explicitly routed for production changes across packages. |
| L235–244 cross-boundary integration and isolated infrastructure/browser evidence | Tests Integration and CI; detailed ownership, environment and browser rules in `tests/integration/AGENTS.md`. |
| L246–248 four CI names and ruleset condition | `tests/AGENTS.md`, Integration and CI; root CI route points to the actual workflow. |
| L250–306 specs/runs/lessons homes, lifecycle, naming, immutable completed specs, triggers and structure | Root Specs, runs and lessons. |
| L308–338 planning/recovery/reviewer, correction lessons, repeated-work skills, acceptance/failure checks, delegation, remote approval, local session artifacts | Root Hard rules. |
| Existing app Next.js-generated block | Preserved verbatim, including BEGIN/END markers. |

## Dropped or merged material

- N4 duplicate: the root CLAUDE.md's SDD reminder repeated root AGENTS.md. Both
  existing CLAUDE.md wrappers were removed at the user's direction. Their only
  remaining behavior was importing AGENTS.md, which agents now read directly.
- N5 dead reference: removed the phrase `using the humanizer skill` from relocated
  copy guidance because no installed humanizer skill exists. Direct/specific copy,
  factual content, validation/recovery instructions and current language remain in
  the UI instructions and canonical design guidelines. No dead router row added.
- Replaced the always-loaded command catalogue with unit-specific commands and
  routes to the existing manifest, README and CI. No command implementation changed.
- No unique safety, testing, design, domain or SDD rule was cut as a no-op. In
  particular, kept the previously reviewed replace-merely-adequate guidance.

## Validation

- `node scripts/check-agent-routes.mjs`: passed, 21 tasks, 46 targets, 8 files.
- Isolated temporary fixtures: all 17 passed. Covered valid AGENTS-only layout,
  independent working directory, missing file/root, directory target, malformed
  table/columns/empty route, missing standard task, absolute/parent escapes,
  root/unit budget failures, exact budget boundaries, CRLF/no final newline and
  ignored dependency/skill installations. No fixtures remain in the repository.
- `node --check scripts/check-agent-routes.mjs`: passed.
- Focused ESLint on the checker and `git diff --check`: passed.
- Read-only independent fidelity review against the original root: completed;
  package-boundary corrections applied. No application tests needed for this
  instruction/tooling-only change.

## Files and gaps

Deliverables: AGENTS.md; packages/{app,core,db,ui}/AGENTS.md;
scripts/setup/AGENTS.md; tests/AGENTS.md; tests/integration/AGENTS.md;
scripts/check-agent-routes.mjs; .ai/lessons.md; deletion of root and app CLAUDE.md.
The user explicitly authorized including this run report in the local commit,
overriding the default session-material exclusion for this file.
An unrelated untracked `scripts/agentsx/` directory appeared during the final
check; left it untouched and excluded it from this run's deliverables.

Humanizer is not installed; install/choose it separately if still desired.
The configured pipeline gate is narrower than the actual CI workflow; routed both
authoritative files without changing either. Publication scope is a local commit
of the results and this report; no remote actions.
