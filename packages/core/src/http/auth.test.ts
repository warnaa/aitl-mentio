import { SignJWT } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "test-secret-that-is-at-least-32-bytes-long!!";
const USER_ID = "4f6d4d5e-2b8c-4a43-9a3f-0b5d2c1e7a10";

async function loadAuth(env: Record<string, string | undefined> = { JWT_SECRET: SECRET }) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return import("./auth");
}

function requestWithCookie(cookie?: string) {
  return new Request("http://localhost/api/things", { headers: cookie ? { cookie } : {} });
}

function sign(payload: Record<string, unknown>, { secret = SECRET, alg = "HS256", expiresIn = "1h" } = {}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setSubject(USER_ID)
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secret));
}

describe("requireSession", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the session from a valid token", async () => {
    const { requireSession, signSessionToken, SESSION_COOKIE_NAME } = await loadAuth();
    const token = await signSessionToken({ userId: USER_ID, role: "mentor" });

    await expect(requireSession(requestWithCookie(`a=b; ${SESSION_COOKIE_NAME}=${token}`))).resolves.toEqual({
      userId: USER_ID,
      role: "mentor",
    });
  });

  it("ignores malformed cookie pairs and finds the session cookie after them", async () => {
    const { requireSession, signSessionToken, SESSION_COOKIE_NAME } = await loadAuth();
    const token = await signSessionToken({ userId: USER_ID, role: "student" });

    await expect(requireSession(requestWithCookie(`garbage; ${SESSION_COOKIE_NAME}=${token}`))).resolves.toEqual({
      userId: USER_ID,
      role: "student",
    });
  });

  it("rejects a cookie header that does not contain the session cookie", async () => {
    const { requireSession } = await loadAuth();

    await expect(requireSession(requestWithCookie("a=b; garbage"))).rejects.toMatchObject({ status: 401 });
  });

  it("rejects a request without a session cookie", async () => {
    const { requireSession } = await loadAuth();

    await expect(requireSession(requestWithCookie())).rejects.toMatchObject({ status: 401 });
  });

  it.each([
    ["signed with another secret", () => sign({ role: "student" }, { secret: "x".repeat(40) })],
    ["expired", () => sign({ role: "student" }, { expiresIn: "-1s" })],
    ["with an unknown role", () => sign({ role: "admin" })],
    ["using a non-HS256 algorithm", () => sign({ role: "student" }, { alg: "HS512" })],
  ])("rejects a token %s", async (_label, makeToken) => {
    const { requireSession, SESSION_COOKIE_NAME } = await loadAuth();
    const token = await makeToken();

    await expect(requireSession(requestWithCookie(`${SESSION_COOKIE_NAME}=${token}`))).rejects.toMatchObject({
      status: 401,
    });
  });

  it("rejects an unsigned (alg: none) token", async () => {
    const { requireSession, SESSION_COOKIE_NAME } = await loadAuth();
    const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ sub: USER_ID, role: "student" })).toString("base64url");

    await expect(
      requireSession(requestWithCookie(`${SESSION_COOKIE_NAME}=${header}.${payload}.`)),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("fails closed with a server error when JWT_SECRET is missing", async () => {
    const { requireSession, SESSION_COOKIE_NAME } = await loadAuth({ JWT_SECRET: undefined });
    const token = await sign({ role: "student" });

    await expect(requireSession(requestWithCookie(`${SESSION_COOKIE_NAME}=${token}`))).rejects.toMatchObject({
      status: 500,
      code: "config_error",
    });
  });
});

describe("authorization helpers", () => {
  const session = { userId: USER_ID, role: "student" } as const;

  it("requireRole denies a different role", async () => {
    const { requireRole } = await loadAuth();

    expect(() => requireRole(session, "student")).not.toThrow();
    expect(() => requireRole(session, "mentor")).toThrow(expect.objectContaining({ status: 403 }));
  });

  it.each([null, undefined, "", "another-user-id"])("assertOwner denies owner %j", async (ownerId) => {
    const { assertOwner } = await loadAuth();

    expect(() => assertOwner(session, ownerId)).toThrow(expect.objectContaining({ status: 403 }));
  });

  it("assertOwner allows the owner", async () => {
    const { assertOwner } = await loadAuth();

    expect(() => assertOwner(session, USER_ID)).not.toThrow();
  });

  it("session cookies are httpOnly, lax, and secure in production", async () => {
    const { sessionCookieOptions } = await loadAuth({ JWT_SECRET: SECRET, NODE_ENV: "production" });

    expect(sessionCookieOptions()).toMatchObject({ httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  });
});
