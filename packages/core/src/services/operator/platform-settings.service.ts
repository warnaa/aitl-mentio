import { LockMode, PLATFORM_SETTINGS_ID, PlatformSettings as PlatformSettingsRow, User, type EntityManager, type IPlatformSettings } from '@devmentor/db';
import { z } from 'zod';
import { requireRole, type Session } from '../../http/auth';
import { parseWith } from '../../http/body';
import { ConflictError, ServiceUnavailableError, UnauthorizedError } from '../../http/errors';
import type { Logger } from '../../logger';
import { MAX_CENTS } from '../../money/money';
import type { Clock } from '../../time/clock';
import { platformSettingsUpdateSchema } from '../../validators/operator/platform-settings-update.schema';

/** D11/R10: the platform keeps 20 % of a session until the operator saves another fee. */
export const DEFAULT_FEE_PERCENT = 20;

const boundsSchema = z.object({ minCents: z.number().int().positive().max(MAX_CENTS), maxCents: z.number().int().positive().max(MAX_CENTS) }).strict().refine(value => value.minCents <= value.maxCents);
const settingsSchema = z.object({
  currency: z.literal('PLN'),
  priceBounds: z.object({ p25: boundsSchema, p50: boundsSchema }).strict(),
  feePercent: z.number().int().min(0).max(100),
});
/** The policy every price, readiness and booking check reads. */
export type PlatformSettings = z.infer<typeof settingsSchema>;
/** What prices and readiness need; consumers that never read the fee depend on this. */
export type PricePolicy = Pick<PlatformSettings, 'currency' | 'priceBounds'>;
/** The operator's view: the policy plus where it came from (version 0 = env defaults, never saved). */
export interface PlatformSettingsView extends PlatformSettings {
  version: number;
  updatedAt: string | null;
  updatedBy: { displayName: string } | null;
}

export interface PlatformSettingsServiceDeps {
  env: { PLATFORM_CURRENCY?: unknown; PLATFORM_PRICE_BOUNDS?: unknown };
  em: EntityManager;
  session: Promise<Session | null>;
  clock: Clock;
  logger: Pick<Logger, 'info'>;
}

const UNAVAILABLE = 'Platform price settings are unavailable.';
const STALE = 'Settings changed since you opened them. Reload to see the current values.';

/**
 * The single source of the operator's price bounds and platform fee (E05-S02). A saved
 * `platform_settings` row wins; with none, the validated env bounds and a 20 % fee are served
 * exactly as before the row existed. Anything malformed fails closed — no fallback here:
 * defaults belong to the validated env, never to missing injected policy.
 *
 * Read once per request scope (the service is scoped), so callers can read it before opening a
 * transaction and never hold one connection while waiting for another.
 */
export class PlatformSettingsService {
  private memo: Promise<PlatformSettingsView> | undefined;

  constructor(private readonly deps: PlatformSettingsServiceDeps) {}

  /** The current policy. Each call returns a fresh copy, so callers cannot mutate shared state. */
  async get(): Promise<PlatformSettings> {
    const { currency, priceBounds, feePercent } = await this.view();
    return { currency, priceBounds: structuredClone(priceBounds), feePercent };
  }

  async boundsFor(minutes: 25 | 50) {
    const { priceBounds } = await this.get();
    return minutes === 25 ? priceBounds.p25 : priceBounds.p50;
  }

  /** Operator only: the policy with its version and last editor, for the settings screen. */
  async getForOperator(): Promise<PlatformSettingsView> {
    await this.operator();
    return structuredClone(await this.view());
  }

  /**
   * Operator only. The first save creates the row (concurrent first saves cannot collide: the
   * insert ignores a conflict and the loser fails the version check). `version` must match what
   * the operator loaded, so one founder never silently overwrites the other.
   */
  async update(input: unknown): Promise<PlatformSettingsView> {
    const session = await this.operator();
    const data = parseWith(platformSettingsUpdateSchema, input);
    const previous = await this.view().catch(() => null);
    const now = this.deps.clock.now();
    const { p25, p50 } = data.priceBounds;
    await this.deps.em.fork().transactional(async em => {
      await em.execute(
        `insert into "platform_settings" ("id", "price25_min_cents", "price25_max_cents", "price50_min_cents", "price50_max_cents", "fee_percent", "currency", "version", "updated_by_id", "updated_at")
         values (?, ?, ?, ?, ?, ?, 'PLN', 0, null, ?) on conflict ("id") do nothing`,
        [PLATFORM_SETTINGS_ID, p25.minCents, p25.maxCents, p50.minCents, p50.maxCents, data.feePercent, now],
      );
      const row = await em.findOneOrFail(PlatformSettingsRow, { id: PLATFORM_SETTINGS_ID }, { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true });
      if (row.version !== data.version) throw new ConflictError(STALE);
      row.price25MinCents = p25.minCents;
      row.price25MaxCents = p25.maxCents;
      row.price50MinCents = p50.minCents;
      row.price50MaxCents = p50.maxCents;
      row.feePercent = data.feePercent;
      row.version = data.version + 1;
      row.updatedBy = em.getReference(User, session.userId);
      row.updatedAt = now;
      await em.flush();
    });
    this.memo = undefined;
    const next = await this.view();
    // D19: this line is the audit record of an operator's settings change.
    this.deps.logger.info({
      actorId: session.userId,
      version: next.version,
      previous: previous && { priceBounds: previous.priceBounds, feePercent: previous.feePercent, version: previous.version },
      next: { priceBounds: next.priceBounds, feePercent: next.feePercent },
    }, 'operator.settings.updated');
    return structuredClone(next);
  }

  private async operator(): Promise<Session> {
    const session = await this.deps.session;
    if (!session) throw new UnauthorizedError();
    return requireRole(session, 'operator');
  }

  private view(): Promise<PlatformSettingsView> {
    this.memo ??= this.read().catch((error: unknown) => {
      this.memo = undefined;
      throw error;
    });
    return this.memo;
  }

  private async read(): Promise<PlatformSettingsView> {
    const row = await this.deps.em.findOne(PlatformSettingsRow, { id: PLATFORM_SETTINGS_ID }, { populate: ['updatedBy'], refresh: true });
    return row ? fromRow(row) : this.fromEnv();
  }

  private fromEnv(): PlatformSettingsView {
    let priceBounds: unknown;
    try { priceBounds = JSON.parse(this.deps.env.PLATFORM_PRICE_BOUNDS as string); }
    catch { throw new ServiceUnavailableError(UNAVAILABLE); }
    const parsed = settingsSchema.safeParse({ currency: this.deps.env.PLATFORM_CURRENCY, priceBounds, feePercent: DEFAULT_FEE_PERCENT });
    if (!parsed.success) throw new ServiceUnavailableError(UNAVAILABLE);
    return { ...parsed.data, version: 0, updatedAt: null, updatedBy: null };
  }
}

function fromRow(row: IPlatformSettings): PlatformSettingsView {
  // The table's checks already hold these invariants; re-validating keeps a bad row fail-closed.
  const parsed = settingsSchema.safeParse({
    currency: row.currency,
    priceBounds: { p25: { minCents: row.price25MinCents, maxCents: row.price25MaxCents }, p50: { minCents: row.price50MinCents, maxCents: row.price50MaxCents } },
    feePercent: row.feePercent,
  });
  if (!parsed.success) throw new ServiceUnavailableError(UNAVAILABLE);
  return {
    ...parsed.data,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy ? { displayName: row.updatedBy.displayName } : null,
  };
}
