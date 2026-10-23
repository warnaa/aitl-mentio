import type { EntityManager, MikroORM } from "@mentio/db";
import type { Logger } from "../logger";
import type { UserService } from "../services/auth/user.service";

/** Everything resolvable from the container. Add one entry per registered dependency. */
export interface Cradle {
  /** Process-wide ORM (singleton). Use `em` for queries, never `orm.em`. */
  orm: MikroORM;
  logger: Logger;
  /**
   * Request-scoped EntityManager fork with its own identity map. Registered only
   * on request scopes, so resolving it (or anything using it) from the root fails.
   */
  em: EntityManager;
  userService: UserService;
}
