import { asClass, asValue, createContainer, InjectionMode, type AwilixContainer } from "awilix";
import { getOrm } from "@mentio/db";
import { getLogger } from "../logger";
import { UserService } from "../services/auth/user.service";
import type { Cradle } from "./cradle";

export type AppContainer = AwilixContainer<Cradle>;

// Composition root. Every binding is registered explicitly here (no `loadModules`
// globbing) so each one is greppable. Cached per module instance so dev-mode reloads
// pick up new registrations; the ORM itself (and its pool) is cached on globalThis.
let rootContainer: Promise<AppContainer> | undefined;

async function buildContainer(): Promise<AppContainer> {
  // PROXY: services destructure dependencies from the cradle. Strict: rejects
  // singletons that depend on scoped registrations.
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY, strict: true });
  container.register({
    orm: asValue(await getOrm()),
    logger: asValue(getLogger()),
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

/** Creates a request scope with a fresh `em` fork. Prefer `withScope`. */
export async function createRequestScope(): Promise<AppContainer> {
  const scope = (await getContainer()).createScope();
  scope.register({ em: asValue(scope.cradle.orm.em.fork()) });
  return scope;
}

/** Runs `fn` against a fresh request scope and disposes the scope afterwards. */
export async function withScope<T>(fn: (cradle: Cradle) => Promise<T>): Promise<T> {
  const scope = await createRequestScope();
  try {
    return await fn(scope.cradle);
  } finally {
    await scope.dispose();
  }
}
