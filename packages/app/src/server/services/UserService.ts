import { User, type EntityManager } from "@mentio/db";

export class UserService {
  private readonly em: EntityManager;

  // PROXY injection: dependencies are destructured from the Awilix cradle.
  constructor({ em }: { em: EntityManager }) {
    this.em = em;
  }

  count(): Promise<number> {
    return this.em.count(User);
  }

  listRecent(limit = 10): Promise<User[]> {
    return this.em.find(User, {}, { orderBy: { createdAt: "desc" }, limit });
  }
}
