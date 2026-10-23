import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { closeOrm, seedUser } from "./support/db";
import { sessionCookie } from "./support/session";

describe("/api/users", () => {
  const url = `${inject("baseUrl")}/api/users`;
  let cookie: string;
  let seededId: string;

  beforeAll(async () => {
    const user = await seedUser("Ada Lovelace");
    seededId = user.id;
    const session = await sessionCookie(user.id);
    cookie = `${session.name}=${session.value}`;
  });
  afterAll(() => closeOrm());

  it("rejects a request without a session", async () => {
    const response = await fetch(url);

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "unauthorized" } });
  });

  it("rejects a forged session", async () => {
    const response = await fetch(url, { headers: { cookie: "mentio_session=not-a-jwt" } });

    expect(response.status).toBe(401);
  });

  it("validates the query", async () => {
    const response = await fetch(`${url}?limit=500`, { headers: { cookie } });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "validation_error" } });
  });

  it("lists users as DTOs for a signed-in user", async () => {
    const response = await fetch(`${url}?limit=100`, { headers: { cookie } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.items).toContainEqual({
      id: seededId,
      email: expect.stringMatching(/@example\.test$/),
      name: "Ada Lovelace",
      createdAt: expect.any(String),
    });
  });

  it("does not expose write methods", async () => {
    const response = await fetch(url, { method: "POST", headers: { cookie, "x-mentio-request": "1" } });

    expect(response.status).toBe(405);
  });
});
