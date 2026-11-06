/** A session starts in the future and still holds or has the slot: it is "upcoming". */
const ACTIVE = new Set(['pending', 'confirmed']);

export interface SessionLike {
  startsAt: string;
  status: string;
}

/**
 * Upcoming sessions (soonest first) apart from past ones (latest first). A reservation
 * that expired or was cancelled is history even when its slot is still ahead, so it
 * never reads as an upcoming session. Presentation only; the server owns what is shown.
 */
export function splitSessions<T extends SessionLike>(sessions: readonly T[], now: Date) {
  const time = (session: T) => new Date(session.startsAt).getTime();
  const upcoming = sessions.filter(session => ACTIVE.has(session.status) && time(session) > now.getTime());
  const past = sessions.filter(session => !upcoming.includes(session));
  return {
    upcoming: [...upcoming].sort((a, b) => time(a) - time(b)),
    past: [...past].sort((a, b) => time(b) - time(a)),
  };
}
