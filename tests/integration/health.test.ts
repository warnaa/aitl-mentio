import { describe, expect, inject, it } from "vitest";

describe("GET /api/health", () => {
  it("reports the database as up", async () => {
    const response = await fetch(`${inject("baseUrl")}/api/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { status: "ok", database: "up" } });
  });
});
