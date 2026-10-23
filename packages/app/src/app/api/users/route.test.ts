import { beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "test-secret-that-is-at-least-32-bytes-long!!";
const USER_ID = "4f6d4d5e-2b8c-4a43-9a3f-0b5d2c1e7a10";

// Mock the persistence boundary only: the route, makeCrudRoute, container and
// UserService all run for real against a fake EntityManager.
const { em } = vi.hoisted(() => ({ em: { findAndCount: vi.fn() } }));
vi.mock("@mentio/db", () => ({
  User: { name: "User" },
  getOrm: async () => ({ em: { fork: () => em } }),
  checkDatabase: vi.fn(),
}));

const context = { params: Promise.resolve({}) };

async function load() {
  vi.resetModules();
  vi.stubEnv("JWT_SECRET", SECRET);
  const [route, http] = await Promise.all([import("./route"), import("@mentio/core/http")]);
  return { GET: route.GET, signSessionToken: http.signSessionToken };
}

describe("GET /api/users", () => {
  beforeEach(() => em.findAndCount.mockReset());

  it("rejects requests without a session", async () => {
    const { GET } = await load();

    const response = await GET(new Request("http://localhost/api/users"), context);

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "unauthorized" } });
    expect(em.findAndCount).not.toHaveBeenCalled();
  });

  it("returns a page of user DTOs for a signed-in user", async () => {
    const { GET, signSessionToken } = await load();
    const createdAt = new Date("2026-10-23T05:41:24.318Z");
    em.findAndCount.mockResolvedValue([
      [{ id: USER_ID, email: "a@example.com", name: undefined, passwordHash: "secret", createdAt }],
      1,
    ]);
    const token = await signSessionToken({ userId: USER_ID, role: "student" });

    const response = await GET(
      new Request("http://localhost/api/users?limit=5&offset=10", { headers: { cookie: `mentio_session=${token}` } }),
      context,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      data: {
        items: [{ id: USER_ID, email: "a@example.com", name: null, createdAt: createdAt.toISOString() }],
        total: 1,
        limit: 5,
        offset: 10,
      },
    });
    expect(em.findAndCount).toHaveBeenCalledWith(
      { name: "User" },
      {},
      { orderBy: { createdAt: "desc", id: "asc" }, limit: 5, offset: 10 },
    );
  });

  it("rejects an out-of-range limit", async () => {
    const { GET, signSessionToken } = await load();
    const token = await signSessionToken({ userId: USER_ID, role: "mentor" });

    const response = await GET(
      new Request("http://localhost/api/users?limit=500", { headers: { cookie: `mentio_session=${token}` } }),
      context,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "validation_error" } });
  });
});
