# Per-file coverage for changed production files

Fresh configured `npm run test:unit:coverage` passed 2026-11-08 at source 9aff0c6: 210 files / 1786 tests. All four metrics remain enforced at 100% per file; no coverage exclusions or thresholds changed. Type-only exports/interfaces have no runtime counters. Complete output: [recovery gate](recovery-gate.log).

| File | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| `packages/app/src/app/api/notes/[bookingId]/route.ts` | 9/9 (100%) | 0/0 (100%) | 4/4 (100%) | 7/7 (100%) |
| `packages/app/src/app/api/notes/[bookingId]/send/route.ts` | 5/5 (100%) | 0/0 (100%) | 2/2 (100%) | 4/4 (100%) |
| `packages/app/src/app/api/notes/route-handler.ts` | 10/10 (100%) | 2/2 (100%) | 3/3 (100%) | 8/8 (100%) |
| `packages/app/src/app/sessions/[bookingId]/SessionNotePanel.tsx` | 87/87 (100%) | 110/110 (100%) | 21/21 (100%) | 63/63 (100%) |
| `packages/app/src/app/sessions/[bookingId]/SessionRoom.tsx` | 61/61 (100%) | 39/39 (100%) | 15/15 (100%) | 48/48 (100%) |
| `packages/app/src/app/sessions/[bookingId]/page.tsx` | 20/20 (100%) | 6/6 (100%) | 2/2 (100%) | 17/17 (100%) |
| `packages/app/src/components/notifications/NotificationsPanel.tsx` | 20/20 (100%) | 26/26 (100%) | 8/8 (100%) | 17/17 (100%) |
| `packages/core/src/container/container.ts` | 65/65 (100%) | 35/35 (100%) | 22/22 (100%) | 64/64 (100%) |
| `packages/core/src/container/cradle.ts` | 0/0 (100%) | 0/0 (100%) | 0/0 (100%) | 0/0 (100%) |
| `packages/core/src/events/event-map.ts` | 0/0 (100%) | 0/0 (100%) | 0/0 (100%) | 0/0 (100%) |
| `packages/core/src/index.ts` | 0/0 (100%) | 0/0 (100%) | 0/0 (100%) | 0/0 (100%) |
| `packages/core/src/services/notes/session-note.service.ts` | 61/61 (100%) | 45/45 (100%) | 12/12 (100%) | 53/53 (100%) |
| `packages/core/src/services/notifications/notification.service.ts` | 69/69 (100%) | 35/35 (100%) | 10/10 (100%) | 60/60 (100%) |
| `packages/core/src/validators/notes/note.schema.ts` | 5/5 (100%) | 0/0 (100%) | 2/2 (100%) | 5/5 (100%) |
| `packages/db/migrations/Migration20261107171237_session_notes.ts` | 14/14 (100%) | 0/0 (100%) | 2/2 (100%) | 14/14 (100%) |
| `packages/db/src/entities/index.ts` | 1/1 (100%) | 0/0 (100%) | 0/0 (100%) | 1/1 (100%) |
| `packages/db/src/entities/notes/session-note.entity.ts` | 4/4 (100%) | 0/0 (100%) | 2/2 (100%) | 3/3 (100%) |
| `packages/db/src/entities/notifications/notification.entity.ts` | 5/5 (100%) | 0/0 (100%) | 3/3 (100%) | 5/5 (100%) |

All included project files: statements 3835/3835, branches 2332/2332, functions 1105/1105, lines 3432/3432.
