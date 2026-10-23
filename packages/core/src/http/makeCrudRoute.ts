import { z } from "zod";
import { withScope } from "../container/container";
import type { Cradle } from "../container/cradle";
import { apiHandler, type RouteHandler } from "./apiHandler";
import { requireSession, type Session } from "./auth";
import { parseJsonBody, parseSearchParams } from "./request";

type Access = "session" | "public";
type SessionFor<A extends Access> = A extends "public" ? null : Session;

const idQuerySchema = z.object({ id: z.uuid() });

interface ListOperation<A extends Access, Q extends z.ZodType> {
  /** Query-string schema; use `z.object({})` when the list takes no parameters. */
  query: Q;
  run: (cradle: Cradle, args: { query: z.output<Q>; session: SessionFor<A> }) => Promise<unknown>;
}
interface CreateOperation<A extends Access, B extends z.ZodType> {
  body: B;
  run: (cradle: Cradle, args: { body: z.output<B>; session: SessionFor<A> }) => Promise<unknown>;
}
interface UpdateOperation<A extends Access, B extends z.ZodType> {
  body: B;
  run: (cradle: Cradle, args: { id: string; body: z.output<B>; session: SessionFor<A> }) => Promise<unknown>;
}
interface RemoveOperation<A extends Access> {
  run: (cradle: Cradle, args: { id: string; session: SessionFor<A> }) => Promise<unknown>;
}

export interface CrudRouteConfig<
  A extends Access,
  LQ extends z.ZodType,
  CB extends z.ZodType,
  UB extends z.ZodType,
> {
  /** Defaults to `"session"`. A `"public"` route must be a deliberate, reviewed choice. */
  access?: A;
  list?: ListOperation<A, LQ>;
  create?: CreateOperation<A, CB>;
  update?: UpdateOperation<A, UB>;
  remove?: RemoveOperation<A>;
}

type CrudRoutes<C> = (C extends { list: object } ? { GET: RouteHandler } : unknown) &
  (C extends { create: object } ? { POST: RouteHandler } : unknown) &
  (C extends { update: object } ? { PUT: RouteHandler } : unknown) &
  (C extends { remove: object } ? { DELETE: RouteHandler } : unknown);

/**
 * Config-driven handlers for a plain CRUD resource: auth → validation → service
 * call (in a request scope) → JSON envelope. PUT/DELETE take the record id from
 * `?id=`. Workflow endpoints (booking, payment, reschedule) use `apiHandler` directly.
 *
 * @example export const { GET, POST } = makeCrudRoute({ list: {...}, create: {...} });
 */
export function makeCrudRoute<
  C extends CrudRouteConfig<A, LQ, CB, UB>,
  A extends Access = "session",
  LQ extends z.ZodType = z.ZodType,
  CB extends z.ZodType = z.ZodType,
  UB extends z.ZodType = z.ZodType,
>(config: C & CrudRouteConfig<A, LQ, CB, UB>): CrudRoutes<C> {
  const authenticate = async (req: Request) =>
    (config.access === "public" ? null : await requireSession(req)) as SessionFor<A>;
  const routes: Partial<Record<"GET" | "POST" | "PUT" | "DELETE", RouteHandler>> = {};
  const { list, create, update, remove } = config;

  if (list) {
    routes.GET = apiHandler(async ({ req }) => {
      const session = await authenticate(req);
      const query = parseSearchParams(req, list.query);
      return withScope((cradle) => list.run(cradle, { query, session }));
    });
  }
  if (create) {
    routes.POST = apiHandler(
      async ({ req }) => {
        const session = await authenticate(req);
        const body = await parseJsonBody(req, create.body);
        return withScope((cradle) => create.run(cradle, { body, session }));
      },
      { status: 201 },
    );
  }
  if (update) {
    routes.PUT = apiHandler(async ({ req }) => {
      const session = await authenticate(req);
      const { id } = parseSearchParams(req, idQuerySchema);
      const body = await parseJsonBody(req, update.body);
      return withScope((cradle) => update.run(cradle, { id, body, session }));
    });
  }
  if (remove) {
    routes.DELETE = apiHandler(async ({ req }) => {
      const session = await authenticate(req);
      const { id } = parseSearchParams(req, idQuerySchema);
      await withScope((cradle) => remove.run(cradle, { id, session }));
      return { id };
    });
  }

  return routes as CrudRoutes<C>;
}
