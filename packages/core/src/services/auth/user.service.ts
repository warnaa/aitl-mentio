import { User, type EntityManager } from "@mentio/db";
import type { Cradle } from "../../container/cradle";
import type { Page } from "../../validators/pagination.schema";
import type { UserListQuery } from "../../validators/auth/user-list.schema";

/** Public shape of a user. Services return DTOs, never entities, so new columns don't leak. */
export interface UserDto {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export class UserService {
  private readonly em: EntityManager;

  constructor({ em }: Pick<Cradle, "em">) {
    this.em = em;
  }

  count(): Promise<number> {
    return this.em.count(User);
  }

  async list({ limit, offset }: UserListQuery): Promise<Page<UserDto>> {
    const [users, total] = await this.em.findAndCount(
      User,
      {},
      { orderBy: { createdAt: "desc", id: "asc" }, limit, offset },
    );
    return { items: users.map(toUserDto), total, limit, offset };
  }
}

function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}
