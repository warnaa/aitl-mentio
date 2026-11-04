# Core

`@devmentor/core` owns zod configuration, pino logging, the awilix v13 container
(`PROXY` mode, typed `Cradle`) and domain services.
It may import db, never React, Next.js or ui.

## Services and scope

- Services throw typed `AppError` subclasses from `src/http/errors.ts` and return
  DTOs (plain objects), never ORM entities or HTTP responses.
- Request-scoped work goes through the scope helpers in
  `src/container/container.ts`: `withScope(fn)` forks an `EntityManager` and
  disposes the scope afterward. Use `withRequestScope(req, fn)` or
  `withSessionCookieScope` when the scope needs the caller's session.
- Cache the awilix container on `globalThis` to survive Next.js HMR.
- Event IDs follow `concept.entity.action` (for example,
  `bookings.booking.created`). Use the typed emitter in `src/events`, registered
  on the `Cradle`; events are in-process only, with no queue or worker.

## HTTP infrastructure

- Reuse `src/http/`: `errors.ts` defines the `AppError` hierarchy;
  `apiHandler.ts` maps errors to status and JSON envelopes and logs unexpected
  failures; `makeCrudRoute.ts` takes a schema and service and returns CRUD
  handlers; `auth.ts` provides `requireSession`, `requireRole` and ownership checks.
- `apiHandler` passes a returned `Response` through for browser redirects.
- Collection routes have no dynamic path parameters: Next may omit `ctx.params`.
  CRUD helpers must guard it before reading an ID.
- `apiHandler` requires `x-devmentor-request` on methods other than
  `GET`/`HEAD`/`OPTIONS`. Routes must not call `requireCsrfHeader` themselves.
  The only `apiHandler(logic, { csrf: false })` opt-out is the payment webhook.
- Declare the `{ ok, data }` / `{ ok, error }` envelope here independently of
  `packages/ui/src/backend/api`; keep their shapes matched without a shared import.

## Configuration

- App environment values go through the zod schema in `src/config/env.ts`.
