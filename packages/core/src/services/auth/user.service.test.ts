import { describe, expect, it, vi } from "vitest";
import type { EntityManager } from "@mentio/db";

const User = class UserEntity {};
vi.mock("@mentio/db", () => ({ User }));

const { UserService } = await import("./user.service");

function serviceWith(em: Partial<Record<"count" | "findAndCount", ReturnType<typeof vi.fn>>>) {
  return new UserService({ em: em as unknown as EntityManager });
}

describe("UserService", () => {
  it("counts users", async () => {
    const count = vi.fn().mockResolvedValue(3);

    await expect(serviceWith({ count }).count()).resolves.toBe(3);
    expect(count).toHaveBeenCalledWith(User);
  });

  it("lists a page of users, newest first, as DTOs", async () => {
    const createdAt = new Date("2026-10-23T10:00:00.000Z");
    const findAndCount = vi.fn().mockResolvedValue([
      [
        { id: "u1", email: "ada@example.com", name: "Ada", createdAt, passwordHash: "$2b$12$secret", updatedAt: createdAt },
        { id: "u2", email: "bob@example.com", name: undefined, createdAt },
      ],
      42,
    ]);

    const page = await serviceWith({ findAndCount }).list({ limit: 2, offset: 4 });

    expect(findAndCount).toHaveBeenCalledWith(
      User,
      {},
      { orderBy: { createdAt: "desc", id: "asc" }, limit: 2, offset: 4 },
    );
    expect(page).toEqual({
      items: [
        { id: "u1", email: "ada@example.com", name: "Ada", createdAt: "2026-10-23T10:00:00.000Z" },
        { id: "u2", email: "bob@example.com", name: null, createdAt: "2026-10-23T10:00:00.000Z" },
      ],
      total: 42,
      limit: 2,
      offset: 4,
    });
  });
});
