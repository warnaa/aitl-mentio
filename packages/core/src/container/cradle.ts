import type { EntityManager, MikroORM } from '@devmentor/db';
import type { AppEnv } from '../config/env';
import type { Logger } from '../logger';
import type { EventBus } from '../events/event-bus';
import type { SessionService } from '../services/auth/session.service';
import type { TokenService } from '../services/auth/token.service';
import type { UserService } from '../services/auth/user.service';
import type { Clock } from '../time/clock';

/**
 * The typed shape of everything registered in the awilix container. Resolving any
 * key off `container.cradle` (or an injected `{ ... }: Cradle` in a constructor) is
 * type-checked against this interface end to end.
 *
 * Lifetimes:
 * - `env`, `logger`, `clock`, `orm`, `eventBus`, `sessionService`, `tokenService` —
 *   SINGLETON (shared for the process).
 * - `em`, `userService` — SCOPED (created fresh per request scope).
 *
 * As services grow to ~9 concepts, each new one is a new explicit line here and in
 * `container.ts` — never auto-discovered from a folder scan.
 */
export interface Cradle {
  env: AppEnv;
  logger: Logger;
  clock: Clock;
  orm: MikroORM;
  eventBus: EventBus;
  sessionService: SessionService;
  tokenService: TokenService;
  em: EntityManager;
  userService: UserService;
}
