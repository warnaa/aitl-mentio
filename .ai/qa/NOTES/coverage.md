# Per-file coverage for changed production files

Configured `npm run test:unit:coverage` passed 2026-11-07 at source 666df13. Thresholds remain per-file 100% for all four metrics. Type-only exports/interfaces may be erased and have no runtime counters.

| File | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| `packages/app/src/app/api/notes/[bookingId]/route.ts` | 9/9 (100%) | 0/0 (100%) | 4/4 (100%) | 100% |
| `packages/app/src/app/api/notes/[bookingId]/send/route.ts` | 5/5 (100%) | 0/0 (100%) | 2/2 (100%) | 100% |
| `packages/app/src/app/api/notes/route-handler.ts` | 10/10 (100%) | 2/2 (100%) | 3/3 (100%) | 100% |
| `packages/app/src/app/sessions/[bookingId]/SessionNotePanel.tsx` | 87/87 (100%) | 110/110 (100%) | 21/21 (100%) | 100% |
| `packages/app/src/app/sessions/[bookingId]/SessionRoom.tsx` | 61/61 (100%) | 39/39 (100%) | 15/15 (100%) | 100% |
| `packages/app/src/app/sessions/[bookingId]/page.tsx` | 20/20 (100%) | 6/6 (100%) | 2/2 (100%) | 100% |
| `packages/app/src/components/notifications/NotificationsPanel.tsx` | 20/20 (100%) | 26/26 (100%) | 8/8 (100%) | 100% |
| `packages/core/src/container/container.ts` | 65/65 (100%) | 35/35 (100%) | 22/22 (100%) | 100% |
| `packages/core/src/container/cradle.ts` | 0/0 (100%) | 0/0 (100%) | 0/0 (100%) | 100% |
| `packages/core/src/events/event-map.ts` | 0/0 (100%) | 0/0 (100%) | 0/0 (100%) | 100% |
| `packages/core/src/index.ts` | 0/0 (100%) | 0/0 (100%) | 0/0 (100%) | 100% |
| `packages/core/src/services/notes/session-note.service.ts` | 59/59 (100%) | 45/45 (100%) | 12/12 (100%) | 100% |
| `packages/core/src/services/notifications/notification.service.ts` | 69/69 (100%) | 35/35 (100%) | 10/10 (100%) | 100% |
| `packages/core/src/validators/notes/note.schema.ts` | 5/5 (100%) | 0/0 (100%) | 2/2 (100%) | 100% |
| `packages/db/migrations/Migration20261107171237_session_notes.ts` | 14/14 (100%) | 0/0 (100%) | 2/2 (100%) | 100% |
| `packages/db/src/entities/index.ts` | 1/1 (100%) | 0/0 (100%) | 0/0 (100%) | 100% |
| `packages/db/src/entities/notes/session-note.entity.ts` | 4/4 (100%) | 0/0 (100%) | 2/2 (100%) | 100% |
| `packages/db/src/entities/notifications/notification.entity.ts` | 5/5 (100%) | 0/0 (100%) | 3/3 (100%) | 100% |
