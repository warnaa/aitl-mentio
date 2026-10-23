import { createContainer, InjectionMode, type AwilixContainer } from "awilix";

export {
  asClass,
  asFunction,
  asValue,
  aliasTo,
  Lifetime,
  type AwilixContainer,
  type Resolver,
} from "awilix";

/**
 * Creates an Awilix container with the project-wide defaults: PROXY injection
 * (dependencies are destructured from the cradle) and strict mode, which
 * rejects lifetime leaks such as a singleton depending on a scoped service.
 */
export function createAppContainer<Cradle extends object>(): AwilixContainer<Cradle> {
  return createContainer<Cradle>({
    injectionMode: InjectionMode.PROXY,
    strict: true,
  });
}
