# Note decisions (#48): verification

Local runs on 2026-11-08 and 2026-11-09, synthetic data only.

- typecheck, lint: exit 0 (2 existing warnings).
- Unit: 215 files, 1830 tests; per-file coverage 100%.
- Build: `npm run build` passed before the final fix; rerun by CI.
- Integration, focused (`session-notes*`, `written-answer`): final combined run 16/16 passed.

## Failures found on the way

- NOTES-008 caught a real regression: the session read depended on the notes table. Fixed; the frozen state now comes from the separately loaded note.
- NOTES-007 had a seed without `note_version`. Test fixed.
- NOTES-012 failed once in a combined run, then passed alone and in the next combined run. The cause was not captured, so treat it as an unexplained intermittent failure.

The full integration suite was not run locally. Human QA is still required (risk-high).

Screenshots: notes-approved-desktop.png, notes-approved-mobile.png, notes-decline-form-mobile.png, notes-operator-declines-desktop.png, notes-operator-declines-mobile.png, notes-redraft-desktop.png, notes-redraft-mobile.png
