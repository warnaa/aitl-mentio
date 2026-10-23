import { randomUUID } from "node:crypto";
import { closeOrm, getOrm } from "@mentio/db";
import { User } from "@mentio/db/entities";

/** Inserts a user with a unique email so suites never depend on each other's data. */
export async function seedUser(name: string | null = "Integration User") {
  const em = (await getOrm()).em.fork();
  const user = em.create(User, { email: `it-${randomUUID()}@example.test`, name });
  await em.flush();
  return user;
}

export async function countUsers() {
  return (await getOrm()).em.fork().count(User);
}

export { closeOrm };
