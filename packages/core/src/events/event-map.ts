import type { Role } from '../services/auth/roles';

/**
 * Registry of domain events. Event IDs follow `concept.entity.action` (past tense);
 * the value type is the event's payload. Add an entry here when a concept needs to
 * emit — this is the single source of truth the typed `EventBus` is generic over.
 *
 * In-process only: these drive synchronous side effects (logging, sending a message,
 * cache invalidation). There is no queue or background worker in this project.
 */
export interface EventMap {
  'bookings.booking.confirmed': { bookingId: string };
  'availability.slot.published': { mentorProfileId: string; slotId: string; startsAt: string };
  'auth.user.created': { userId: string; email: string };
  /**
   * A user's stored role set changed membership: `grantRole`/`revokeRole`, or the
   * operator cache reconciled against `OPERATOR_EMAILS`. `added`/`removed` are in
   * `ROLES` order. Observability only — the R18 record is the allowlist commit.
   */
  'auth.user.roles_changed': { userId: string; added: Role[]; removed: Role[] };
  /** The first role grant path (E02-S01); the durable deadline lives on the profile. */
  'invitations.invitation.accepted': { invitationId: string; userId: string; publishDueAt: string };
  'mentors.profile.published': { mentorProfileId: string; slug: string };
}

export type EventId = keyof EventMap;
