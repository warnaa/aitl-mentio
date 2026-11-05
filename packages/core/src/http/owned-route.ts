import type { z } from 'zod';
import { withRequestScope } from '../container/container';
import type { Cradle } from '../container/cradle';
import { apiHandler } from './apiHandler';
import { requireRole, requireSession, type Role } from './auth';
import { readJsonBody, parseWith } from './body';
import { BadRequestError } from './errors';

export type OwnedParams = Record<string, string | string[]>;
export interface OwnedActionOptions {
  role?: Role;
  run: (cradle: Cradle, params: OwnedParams, req: Request) => Promise<unknown>;
}

/** apiHandler remains the single CSRF owner; Responses keep their action cookies. */
export function ownedAction(options: OwnedActionOptions) {
  return apiHandler((req, ctx) =>
    withRequestScope(req, async (cradle) => {
      const session = await requireSession(req, cradle);
      if (options.role) requireRole(session, options.role);
      const params = ctx?.params ? await ctx.params : {};
      return options.run(cradle, params, req);
    }),
  );
}

export interface OwnedResourceOptions<T> {
  role: Role;
  read: (cradle: Cradle, params: OwnedParams) => Promise<unknown>;
  updateSchema?: z.ZodType<T>;
  update?: (cradle: Cradle, input: T, params: OwnedParams) => Promise<unknown>;
}
export function makeOwnedResourceRoute<T>(options: OwnedResourceOptions<T>) {
  return {
    GET: ownedAction({ role: options.role, run: (cradle, params) => options.read(cradle, params) }),
    PUT: ownedAction({
      role: options.role,
      run: async (cradle, params, req) => {
        if (!options.update || !options.updateSchema)
          throw new BadRequestError('This operation is not supported');
        return options.update(cradle, parseWith(options.updateSchema, await readJsonBody(req)), params);
      },
    }),
  };
}

export interface OwnedCollectionOptions<T> {
  role: Role;
  list: (cradle: Cradle) => Promise<unknown>;
  createSchema: z.ZodType<T>;
  create: (cradle: Cradle, input: T) => Promise<unknown>;
  remove: (cradle: Cradle, params: OwnedParams) => Promise<unknown>;
}
export function makeOwnedCollectionRoute<T>(options: OwnedCollectionOptions<T>) {
  return {
    GET: ownedAction({ role: options.role, run: cradle => options.list(cradle) }),
    POST: ownedAction({ role: options.role, run: async (cradle, _params, req) => options.create(cradle, parseWith(options.createSchema, await readJsonBody(req))) }),
    DELETE: ownedAction({ role: options.role, run: (cradle, params) => options.remove(cradle, params) }),
  };
}
