<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Spec-Driven Development (SDD) and AI memory

This project uses `.ai/` as the source of truth for specs, run logs, and accumulated
lessons. Any AI agent working in this repo MUST follow the structure and workflow below.

## `.ai/specs/` — specifications

- Every non-trivial feature or change starts as a spec file at `.ai/specs/YYYY-MM-DD-slug.md`
  (date the spec was created, short kebab-case slug describing the work).
- Before starting implementation of a non-trivial task, check whether a relevant spec
  already exists. If not and the task warrants one, write it first and confirm it with
  the user before coding.
- Every spec ends with a **Done means** list of checkable completion criteria (e.g.
  specific behavior works, lint and build pass). Work isn't finished until all are met.
- Lifecycle:
  - Active, not-yet-implemented specs live directly in `.ai/specs/`.
  - Once a spec has been fully implemented, move its file to `.ai/specs/implemented/`
    (keep the same filename).
  - Specs that are abandoned, superseded, or no longer relevant go to
    `.ai/specs/archive/` instead of being deleted.

## `.ai/runs/` — autonomous run logs

- Every autonomous AI run (unattended / multi-step agent work, not a short interactive
  back-and-forth) MUST produce a log file at `.ai/runs/YYYY-MM-DD-slug.md` (date of the
  run, short kebab-case slug describing what the run did).
- The log should capture: what was asked, what was done, which specs/files were
  touched, and the outcome (done / partially done / blocked), so a human or another
  agent can reconstruct what happened without replaying the whole session.
- Keep the run's task checklist in the log and update it as you go. It survives context
  summarization, which can drop details of the original plan.
- End the log with a **Needs from you** section listing blockers that only a human can
  resolve (API keys, manual confirmations, external config), or "none".

## `.ai/lessons.md` and `.ai/lessons/` — long-term memory

- `.ai/lessons.md` is an append-only running log of lessons learned: non-obvious bugs
  and their root causes, gotchas/footguns in this codebase or its dependencies, and
  decisions future work should respect. Read it before starting non-trivial work, and
  add an entry after fixing a bug or learning something worth remembering long-term.
- When the user corrects your approach, record it as a lesson so it isn't repeated. If
  the correction is a rule for every task, propose adding it to this file instead.
- For lessons that need more than a few sentences, write the full detail in
  `.ai/lessons/YYYY-MM-DD-slug.md` and link it from the corresponding entry in
  `.ai/lessons.md`.

## Working principles

Adapted from Boris Cherny's Claude Code tips and the Opus 5.5 prompting guide.

- **Keep going until done.** When a step doesn't need user input, continue. Put status
  notes in the same message as your next action, and take the next step rather than
  announcing it. Stop and ask only when you can't continue without the user, or before
  anything destructive (deleting data, force-pushing, changing anything outside the repo).
- **Plan complex tasks first.** Plan the whole task before editing. For non-trivial
  features, the plan is the spec. If implementation goes off track, stop and re-plan
  instead of pushing through.
- **Verify before calling it done.** After changes, run `npm run lint` and
  `npm run build`. For UI changes, also run `npm run dev` and check the affected pages.
  Review your own diff and be ready to justify the approach. If the result is mediocre,
  rework it. Report what you verified, what you couldn't, and anything you need from
  the user.
- **Fix bugs end to end.** Given a bug report, failing build, or error log, reproduce
  it, find the root cause, and fix it without needing step-by-step direction.
- **Split large jobs into narrow units.** Delegate heavy or broad work to subagents, one
  narrowly scoped unit each (e.g. one directory), and cross-check their findings before
  concluding. Run parallel sessions in separate git worktrees so they don't conflict.
- **Review for blockers.** When reviewing code, list only problems that would block a
  merge, each with file, line, why it's a problem, and a fix.
- **Turn repeated workflows into skills** under `.claude/skills/`, committed to git.

## Enforcement

- Do not skip writing a spec for non-trivial work, a run log for autonomous runs, or a
  lessons entry after a non-obvious fix or correction — these are how context persists across
  sessions and agents in this project.
- Always use the `YYYY-MM-DD-slug.md` naming convention for files under `.ai/specs/`
  and `.ai/runs/`.
