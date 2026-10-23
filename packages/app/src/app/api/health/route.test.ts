import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { checkDatabase, logWarn } = vi.hoisted(() => ({ checkDatabase: vi.fn(), logWarn: vi.fn() }));
vi.mock("@mentio/core/container", () => ({ checkDatabase }));
vi.mock("@mentio/core/logger", () => ({ getLogger: () => ({ warn: logWarn, error: vi.fn() }) }));

const request = () => new Request("http://localhost/api/health");
const context = { params: Promise.resolve({}) };

describe("GET /api/health", () => {
  it("reports the database as up", async () => {
    checkDatabase.mockResolvedValue({ isUp: true });

    const response = await GET(request(), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { status: "ok", database: "up" } });
    expect(logWarn).not.toHaveBeenCalled();
  });

  it("reports the database as down without leaking the reason", async () => {
    checkDatabase.mockResolvedValue({ isUp: false, reason: "password authentication failed" });

    const response = await GET(request(), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { status: "ok", database: "down" } });
    expect(logWarn).toHaveBeenCalledWith(
      { reason: "password authentication failed" },
      "Health check: database is down",
    );
  });
});
