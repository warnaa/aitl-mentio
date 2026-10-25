> **Repo-local override.** Assigns every PR `om-open-pr` opens to the person who opened it (the authenticated tracker user, `$CURRENT_USER`), so a PR never sits unassigned.

## Step 5 — reuse or open the PR (extend)

Right after the PR is opened or reused and `PR_NUMBER` / `PR_URL` are set, before labels (step 6):

1. Resolve `CURRENT_USER` via **current-user** (reuse it if already resolved). Never hard-code a login — the assignee is whoever is authenticated for this run.
2. Read the PR via **get-pr** with fields `author,assignees` and pick the opener:
   - newly opened PR → `OPENER=$CURRENT_USER`;
   - reused PR → `OPENER` is the PR's `author.login` (the person who opened it, which may differ from `CURRENT_USER`).
3. If `OPENER` is not already among `assignees`, **assign-pr** `$OPENER` to `{prNumber}`. Add only — never remove existing assignees here. Tolerate failure (log it, continue to step 6); a failed assignment never blocks the run.

This assignment is ownership, not a claim: it posts no claim comment and applies no `in-progress` label. With `--handoff`, step 8's **assign-pr** of `$CURRENT_USER` is then an idempotent no-op on the assignee.

## Step 8 — lock transfer and release (extend)

Never unassign the opener from the PR as part of the issue handback or lock release; only the `in-progress` label and the claim comments carry the lock.

## Output contract (extend)

Add one line after `PR opened:` (omit it on the blocked paths):

```
Assignee: <OPENER login, or "unassigned — <reason>" when assign-pr failed>
```
