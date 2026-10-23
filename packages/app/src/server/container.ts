import "server-only";

import { asClass, asValue, createAppContainer, type AwilixContainer } from "@mentio/core";
import { getOrm, type EntityManager, type MikroORM } from "@mentio/db";
import { UserService } from "./services/UserService";

/** Everything resolvable from the container. */
export interface AppCradle {
  /** Process-wide ORM (singleton). Use `em` for queries, never `orm.em`. */
  orm: MikroORM;
  /**
   * Request-scoped EntityManager fork with its own identity map. Registered only
   * on request scopes, so resolving it (or anything using it) from the root fails.
   */
  em: EntityManager;
  userService: UserService;
}

export type AppContainer = AwilixContainer<AppCradle>;

// Composition root. Cached per module instance so dev-mode reloads pick up new
// registrations; the ORM itself (and its pool) is cached on globalThis by @mentio/db.
let rootContainer: Promise<AppContainer> | undefined;

async function buildContainer(): Promise<AppContainer> {
  const container = createAppContainer<AppCradle>();
  container.register({
    orm: asValue(await getOrm()),
    userService: asClass(UserService).scoped(),
  });
  return container;
}

export function getContainer(): Promise<AppContainer> {
  rootContainer ??= buildContainer().catch((error: unknown) => {
    rootContainer = undefined;
    throw error;
  });
  return rootContainer;
}

/**
 * Creates a per-request scope. Resolve request-level services (anything that
 * touches `em`) from the scope, not from the root container.
 */
export async function createRequestScope(): Promise<AppContainer> {
  const scope = (await getContainer()).createScope();
  scope.register({ em: asValue(scope.cradle.orm.em.fork()) });
  return scope;
}
