import { User, type EntityManager, type IUser } from '@devmentor/db';

/** The user columns a version-guarded write may change. */
export type UserVersionedUpdate = Partial<Pick<IUser, 'roles' | 'sessionVersion' | 'updatedAt'>>;

/**
 * Write `data` to the user's row only while its `session_version` is still the one
 * `user` holds, then re-sync `user` with the database. Returns whether the row matched.
 *
 * The write is a targeted `nativeUpdate`, not a `flush`, so a session resolved midway
 * through a service never flushes that service's pending unit of work. But
 * `nativeUpdate` bypasses MikroORM's identity map: without the `refresh`, every later
 * `findOne` in the same scope would hand back the pre-write roles and version, so a
 * `grantRole` followed by a `revokeRole` would compute from stale roles and miss its
 * own precondition. The refresh runs on a miss as well, because then the row moved
 * under us and the entity must stop carrying the stale version too.
 *
 * The refresh is one primary-key `SELECT`, paid only on these rare writes (role
 * changes, sign-out, an allowlist change), never on the plain read path.
 *
 * @param user an entity managed by `em` — `refresh` re-hydrates that same instance.
 */
export async function updateUserAtVersion(
  em: Pick<EntityManager, 'nativeUpdate' | 'refresh'>,
  user: { id: string; sessionVersion: number },
  data: UserVersionedUpdate,
): Promise<boolean> {
  const updated = await em.nativeUpdate(User, { id: user.id, sessionVersion: user.sessionVersion }, data);
  await em.refresh(user);
  return updated > 0;
}
