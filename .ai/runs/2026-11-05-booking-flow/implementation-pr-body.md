Closes #40
Refs #68
Source doc: .ai/specs/2026-11-05-booking-flow.md
Tracking plan: PR body Tasks table; local .ai/runs/2026-11-05-booking-flow/PLAN.md
Status: in-progress

## 🎯 Goal
A mentee chooses a published slot at least two hours ahead and reserves 25 or 50 minutes at the authoritative mentor price.

## Tasks
| Phase | Step | Title | Exec | Status | Commit |
| --- | --- | --- | --- | --- | --- |
| 0 | 0.1 | Record booking security and compatibility contract | inline | done | c4984df |
| 1 | 1.1 | Add booking entity and reversible migration | inline | done | 02f358b |
| 1 | 1.2 | Add transactional booking service and occupancy-aware removal | inline | done | 2f5f77d |
| 1 | 1.3 | Expose guarded booking route and DI | inline | done | 493d68d |
| 1 | 1.2-review-fix | Align removal locks and occupied availability | inline | done | 737adde |
| 2 | 2.1 | Add slot selection, sign-in return and shared session notice | inline | done | 9ef5181 |
| 3 | 3.1 | Add documented booking integration scenarios | inline | todo | — |
| 3 | 3.2 | Complete coverage, compatibility and independent verification | inline | todo | — |

## 🧪 Validation
Not yet run. Required: typecheck, lint, test, build, per-file unit coverage and explicit npm run test:integration. Review and UI QA pending. No merge or deployment.

## 💥 Breaking Changes
An additive bookings table and public viableLengths field; occupied-slot removal now refuses active holds. Rollback and security invariants are documented in BACKWARD_COMPATIBILITY.md and docs/security/threat-model.md.

Repository AGENTS.md overrides the skill's run-folder publication: logs, local drafts, working references and generated previews stay local. The Tasks table above is the remote continuation record.