# Restore the AI artifact commit policy

Request: resolve the instruction split's exclusion of `.ai/runs/` and `.ai/qa/` records from commits, restoring the lesson-12 package policy.

Work: compared the ZIP's working rule 7 against current root instructions and history; independently checked local instructions and ignore patterns for conflicting exclusions. The split retained an older exclusion rather than the ZIP's explicit commit policy. The existing lesson recorded the intended correction but root instructions still contradicted it.

Files: `AGENTS.md`, `.ai/lessons.md`, `.ai/skills/om-prepare-test-env/SKILL.md`, `.ai/skills/om-integration-tests/SKILL.md`, `.gitignore`, and this run record.

Outcome: restored committing sanitized `.ai/` run logs, QA reports/evidence, helpers, drafts, references and previews alongside their work. Corrected both local skill exclusions. Removed the blanket `.ai/qa/artifacts_*/` ignore; retained specific test-environment state and env-file ignores. No commit, push or other remote write performed.

Verification: agent-route/budget checker and whitespace check passed. Git ignore probes confirmed run logs, QA reports, ordinary screenshots and artifacts-directory evidence are eligible for staging; test-env descriptors, secrets, cache, runtime files and env files remain ignored.

Follow-ups: include relevant sanitized records in future commits. No application tests needed for this instruction-only change.

User clarification: use the agentic-setup override pattern rather than editing installed skills. Verified step 3 of both installed skills' `references/agentic-setup.md`: the changed `.ai/skills/<skill>/SKILL.md` files are precisely those repo-local extensions. No installed `.agents/skills/` files were changed. Added the distinction to root instructions and lessons; retained the fixes in the existing overrides. Re-ran route/budget and whitespace checks successfully.

Further clarification: `SDLC.md` already defines repo-local skill overrides under Amending this process, and the root delivery-pipeline route points there. Removed the redundant skill-customization bullet added to `AGENTS.md`; the artifact commit-policy correction remains. Recorded the correction in lessons and rechecked route/budget and whitespace validation.

Publication: user explicitly requested commit and PR creation. Prepared branch `docs/restore-ai-artifact-records` against the live default branch `main`. Reviewed all seven deliverables, including both run records, for sensitive content; no secrets found. Route/budget and whitespace checks passed. Runtime checks skipped because no application source changed. The GitHub and git-ref operations require the authorized execution context on this machine.
