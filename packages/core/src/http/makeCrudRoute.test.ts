import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const SECRET = "test-secret-that-is-at-least-32-bytes-long!!";
const USER_ID = "4f6d4d5e-2b8c-4a43-9a3f-0b5d2c1e7a10";
const RECORD_ID = "0e0c7b1e-6a8f-4d7b-9c55-3f1f2a9d8b44";

vi.mock("../logger", () => ({ getLogger: () => ({ error: vi.fn() }) }));
const fakeCradle = { marker: "cradle" };
vi.mock("../container/container", () => ({
  withScope: <T>(fn: (cradle: unknown) => Promise<T>) => fn(fakeCradle),
}));

const { makeCrudRoute } = await import("./makeCrudRoute");
const { signSessionToken, SESSION_COOKIE_NAME } = await import("./auth");
const { CSRF_HEADER, CSRF_HEADER_VALUE } = await import("./apiHandler");

const context = { params: Promise.resolve({}) };

type Envelope = { ok: boolean; data?: unknown; error?: { code: string; fieldErrors?: Record<string, string[]> } };
const readBody = (response: Response) => response.json() as Promise<Envelope>;
const noteSchema = z.object({ title: z.string().min(1) });

async function request(method: string, path: string, { body, isSignedIn = true }: { body?: unknown; isSignedIn?: boolean } = {}) {
  const headers = new Headers({ [CSRF_HEADER]: CSRF_HEADER_VALUE, "content-type": "application/json" });
  if (isSignedIn) {
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${await signSessionToken({ userId: USER_ID, role: "student" })}`);
  }
  return new Request(`http://localhost${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("makeCrudRoute", () => {
  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", SECRET);
  });

  it("only exposes the configured methods", () => {
    const routes = makeCrudRoute({ list: { query: z.object({}), run: async () => [] } });

    expect(Object.keys(routes)).toEqual(["GET"]);
  });

  it("requires a session by default and never calls the service without one", async () => {
    const run = vi.fn(async () => []);
    const { GET } = makeCrudRoute({ list: { query: z.object({}), run } });
    const response = await GET(await request("GET", "/api/notes", { isSignedIn: false }), context);

    expect(response.status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  it("passes the parsed query, session and cradle to list", async () => {
    const run = vi.fn(async () => ["note"]);
    const { GET } = makeCrudRoute({
      list: { query: z.object({ limit: z.coerce.number().default(10) }), run },
    });
    const response = await GET(await request("GET", "/api/notes?limit=5"), context);

    expect(await readBody(response)).toEqual({ ok: true, data: ["note"] });
    expect(run).toHaveBeenCalledWith(fakeCradle, {
      query: { limit: 5 },
      session: { userId: USER_ID, role: "student" },
    });
  });

  it("allows deliberately public routes without a session", async () => {
    const { GET } = makeCrudRoute({ access: "public", list: { query: z.object({}), run: async () => [] } });
    const response = await GET(await request("GET", "/api/notes", { isSignedIn: false }), context);

    expect(response.status).toBe(200);
  });

  it("creates with 201 and only the schema's fields (no mass assignment)", async () => {
    const run = vi.fn(async (_cradle: unknown, { body }: { body: z.infer<typeof noteSchema> }) => body);
    const { POST } = makeCrudRoute({ create: { body: noteSchema, run } });
    const response = await POST(
      await request("POST", "/api/notes", { body: { title: "Hi", id: RECORD_ID, ownerId: "someone-else" } }),
      context,
    );

    expect(response.status).toBe(201);
    expect(run.mock.calls[0][1].body).toEqual({ title: "Hi" });
  });

  it("rejects an invalid create body with field errors", async () => {
    const run = vi.fn();
    const { POST } = makeCrudRoute({ create: { body: noteSchema, run } });
    const response = await POST(await request("POST", "/api/notes", { body: { title: "" } }), context);

    expect(response.status).toBe(400);
    expect((await readBody(response)).error?.fieldErrors?.title).toBeDefined();
    expect(run).not.toHaveBeenCalled();
  });

  it("update and remove take a UUID id from the query string", async () => {
    const update = vi.fn<(cradle: unknown, args: { id: string; body: unknown }) => Promise<string>>(
      async () => "updated",
    );
    const remove = vi.fn<(cradle: unknown, args: { id: string }) => Promise<void>>(async () => undefined);
    const { PUT, DELETE } = makeCrudRoute({ update: { body: noteSchema, run: update }, remove: { run: remove } });

    const updated = await PUT(await request("PUT", `/api/notes?id=${RECORD_ID}`, { body: { title: "New" } }), context);
    const removed = await DELETE(await request("DELETE", `/api/notes?id=${RECORD_ID}`), context);
    const invalid = await DELETE(await request("DELETE", "/api/notes?id=1"), context);

    expect(updated.status).toBe(200);
    expect(update.mock.calls[0][1]).toMatchObject({ id: RECORD_ID, body: { title: "New" } });
    expect(await readBody(removed)).toEqual({ ok: true, data: { id: RECORD_ID } });
    expect(invalid.status).toBe(400);
  });
});
