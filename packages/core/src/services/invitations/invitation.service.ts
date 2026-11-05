import { z } from 'zod';
import {
  Invitation,
  LockMode,
  MentorProfile,
  UniqueConstraintViolationException,
  User,
  type EntityManager,
  type IInvitation,
} from '@devmentor/db';
import { EventBus } from '../../events/event-bus';
import type { EventMap } from '../../events/event-map';
import { requireRole } from '../../http/auth';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../http/errors';
import type { AppEnv } from '../../config/env';
import { UserService, type UserServiceDeps } from '../auth/user.service';
import type { TokenService } from '../auth/token.service';
import { normalizeRoles } from '../auth/roles';
import { StackTags } from '../../domain/vocabularies/stack-tags';

const DAY_MS = 86_400_000;
const createSchema = z.object({
  email: z.string().trim().toLowerCase().max(255).pipe(z.email()),
  stackTags: z.array(StackTags.schema).max(StackTags.values.length),
  batch: z.string().trim().min(1).max(64).optional(),
});

export interface InvitationServiceDeps extends UserServiceDeps {
  env: UserServiceDeps['env'] &
    Pick<AppEnv, 'APP_URL' | 'INVITATION_TTL_DAYS' | 'MENTOR_PUBLISH_WINDOW_DAYS'>;
  tokenService: Pick<TokenService, 'mintOpaqueToken' | 'hashToken'>;
}

export interface InvitationLookup {
  email: string;
  stackTags: string[];
  expiresAt: string;
}
export interface InvitationLink {
  id: string;
  link: string;
}
export const INVALID_INVITATION = 'This invitation is not valid.';

/** System commands create/revoke/resend; authenticated acceptance is bound to verified identity. */
export class InvitationService {
  constructor(private readonly deps: InvitationServiceDeps) {}

  /** Returns the secret exactly once to the operator caller. Never log the result. */
  async create(input: { email: string; stackTags: string[]; batch?: string }): Promise<InvitationLink> {
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError('Check the invitation email, tags and batch.');
    const { email, stackTags, batch } = parsed.data;
    const pair = this.deps.tokenService.mintOpaqueToken();
    try {
      const invitation = await this.deps.em.transactional(async (em) => {
        const user = await em.findOne(
          User,
          { email: { $ilike: email.replace(/[\\%_]/g, '\\$&') } },
          { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
        );
        if (user?.roles.includes('mentor')) throw new ConflictError('This account is already a mentor.');
        const pending = await em.findOne(Invitation, { email, acceptedAt: null, revokedAt: null });
        if (pending) throw new ConflictError('Resend or revoke the unresolved invitation for this address.');
        const now = this.deps.clock.now();
        const row = em.create(Invitation, {
          email,
          stackTags: [...new Set(stackTags)],
          tokenHash: pair.hash,
          expiresAt: new Date(now.getTime() + this.deps.env.INVITATION_TTL_DAYS * DAY_MS),
          createdAt: now,
          updatedAt: now,
          batch,
        });
        em.persist(row);
        await em.flush();
        return row;
      });
      return this.link(invitation.id, pair.token);
    } catch (error) {
      if (
        error instanceof UniqueConstraintViolationException &&
        (error as { constraint?: string }).constraint === 'invitations_unresolved_email_unique'
      ) {
        throw new ConflictError('Resend or revoke the unresolved invitation for this address.');
      }
      throw error;
    }
  }

  async lookup(token: string): Promise<InvitationLookup> {
    const row = await this.deps.em.findOne(Invitation, {
      tokenHash: this.deps.tokenService.hashToken(token),
    });
    this.assertValid(row);
    return { email: row.email, stackTags: [...row.stackTags], expiresAt: row.expiresAt.toISOString() };
  }

  async accept(token: string) {
    const session = await this.deps.session;
    if (!session) throw new UnauthorizedError();
    const roleEvents: EventMap['auth.user.roles_changed'][] = [];
    const bufferedEvents = new EventBus({ logger: this.deps.logger });
    bufferedEvents.on('auth.user.roles_changed', (event) => {
      roleEvents.push(event);
    });
    const result = await this.deps.em.transactional(async (em) => {
      // Every invitation path locks the user before the invitation/profile. A fresh read
      // under lock defeats the request scope's earlier, potentially stale identity map.
      const user = await em.findOne(
        User,
        { id: session.userId },
        { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
      );
      if (!user) throw new UnauthorizedError();
      const row = await em.findOne(
        Invitation,
        { tokenHash: this.deps.tokenService.hashToken(token) },
        { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
      );
      this.assertValid(row);
      if (!user.emailVerifiedAt || user.email.trim().toLowerCase() !== row.email) {
        throw new ForbiddenError('Sign in with the verified email address this invitation was sent to.');
      }
      const now = this.deps.clock.now();
      const publishDueAt = new Date(now.getTime() + this.deps.env.MENTOR_PUBLISH_WINDOW_DAYS * DAY_MS);
      const version = await this.userService(em, bufferedEvents).grantRole(user.id, 'mentor');
      let profile = await em.findOne(
        MentorProfile,
        { user: user.id },
        { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
      );
      if (!profile) {
        profile = em.create(MentorProfile, { user, headline: '', initialPublishDueAt: publishDueAt });
        em.persist(profile);
      } else if (!profile.initialPublishDueAt) {
        profile.initialPublishDueAt = publishDueAt;
      }
      row.acceptedAt = now;
      row.acceptedBy = user;
      row.publishDueAt = publishDueAt;
      await em.flush();
      return {
        invitationId: row.id,
        userId: user.id,
        roles: normalizeRoles(user.roles),
        sessionVersion: version,
        publishDueAt: publishDueAt.toISOString(),
      };
    });
    for (const event of roleEvents) await this.deps.eventBus.emit('auth.user.roles_changed', event);
    await this.deps.eventBus.emit('invitations.invitation.accepted', {
      invitationId: result.invitationId,
      userId: result.userId,
      publishDueAt: result.publishDueAt,
    });
    return result;
  }

  async revoke(id: string): Promise<{ id: string }> {
    return this.deps.em.transactional(async (em) => {
      const row = await this.pending(em, id);
      row.revokedAt = this.deps.clock.now();
      await em.flush();
      return { id: row.id };
    });
  }

  async resend(id: string): Promise<InvitationLink> {
    return this.deps.em.transactional(async (em) => {
      const row = await this.pending(em, id);
      const pair = this.deps.tokenService.mintOpaqueToken();
      row.tokenHash = pair.hash;
      row.expiresAt = new Date(this.deps.clock.now().getTime() + this.deps.env.INVITATION_TTL_DAYS * DAY_MS);
      await em.flush();
      return this.link(row.id, pair.token);
    });
  }

  async onboarding(): Promise<{ initialPublishDueAt: string | null }> {
    const session = await this.deps.session;
    if (!session) throw new UnauthorizedError();
    requireRole(session, 'mentor');
    const profile = await this.deps.em.findOne(MentorProfile, { user: session.userId });
    return { initialPublishDueAt: profile?.initialPublishDueAt?.toISOString() ?? null };
  }

  /**
   * A `UserService` bound to the acceptance transaction and its buffered events. Its
   * deps are named, not spread: spreading the awilix cradle resolves every registration.
   */
  private userService(em: EntityManager, eventBus: EventBus): UserService {
    const { logger, clock, env, passwordService, rateLimiter, mailer, emailVerification, session } = this.deps;
    return new UserService({ em, eventBus, logger, clock, env, passwordService, rateLimiter, mailer, emailVerification, session });
  }

  private assertValid(row: IInvitation | null): asserts row is IInvitation {
    if (!row || row.acceptedAt || row.revokedAt || row.expiresAt <= this.deps.clock.now())
      throw new NotFoundError(INVALID_INVITATION);
  }

  private async pending(em: EntityManager, id: string): Promise<IInvitation> {
    const row = await em.findOne(Invitation, { id }, { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true });
    if (!row) throw new NotFoundError('Invitation not found.');
    if (row.acceptedAt || row.revokedAt) throw new ConflictError('Only pending invitations can be changed.');
    return row;
  }

  private link(id: string, token: string): InvitationLink {
    return { id, link: `${this.deps.env.APP_URL}/invitation/${token}` };
  }
}
