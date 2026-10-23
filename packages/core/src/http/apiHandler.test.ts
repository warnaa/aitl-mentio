import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

const loggerError = vi.fn();
vi.mock("../logger", () => ({ getLogger: () => ({ error: loggerError }) }));

const { apiHandler, CSRF_HEADER, CSRF_HEADER_VALUE } = await import("./apiHandler");
const { ConflictError, NotFoundError } = await import("./errors");
const { parseJsonBody } = await import("./request");

const context = { params: Promise.resolve({}) };

type Envelope = { ok: boolean; data?: unknown; error?: { code: string; message: string; fieldErrors?: Record<string, string[]> } };
const readBody = (response: Response) => response.json() as Promise<Envelope>;

function post(body: unknown, headers: Record<string, string> = { [CSRF_HEADER]: CSRF_HEADER_VALUE }) {
  return new Request("http://localhost/api/things", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("apiHandler", () => {
  it("wraps the handler result in a success envelope", async () => {
    const handler = apiHandler(async () => ({ hello: "world" }));
    const response = await handler(new Request("http://localhost/api/things"), context);

    expect(response.status).toBe(200);
    expect(await readBody(response)).toEqual({ ok: true, data: { hello: "world" } });
  });

  it("passes resolved route params to the handler", async () => {
    const handler = apiHandler<string, { id: string }>(async ({ params }) => params.id);
    const response = await handler(new Request("http://localhost/api/things/42"), {
      params: Promise.resolve({ id: "42" }),
    });

    expect(await readBody(response)).toEqual({ ok: true, data: "42" });
  });

  it.each([
    [new NotFoundError("Booking not found"), 404, "not_found"],
    [new ConflictError("Slot already taken"), 409, "conflict"],
  ])("maps %s to its status and code", async (error, status, code) => {
    const handler = apiHandler(async () => {
      throw error;
    });
    const response = await handler(new Request("http://localhost/api/things"), context);

    expect(response.status).toBe(status);
    expect(await readBody(response)).toEqual({ ok: false, error: { code, message: error.message } });
    expect(loggerError).not.toHaveBeenCalled();
  });

  it("hides unexpected errors from the client and logs them", async () => {
    const handler = apiHandler(async () => {
      throw new Error("connection string postgres://user:secret@db leaked");
    });
    const response = await handler(new Request("http://localhost/api/things"), context);
    const body = await readBody(response);

    expect(response.status).toBe(500);
    expect(body).toEqual({ ok: false, error: { code: "internal_error", message: "Internal server error" } });
    expect(JSON.stringify(body)).not.toContain("secret");
    expect(loggerError).toHaveBeenCalledOnce();
  });

  it("rejects state-changing requests without the CSRF header", async () => {
    const run = vi.fn(async () => "created");
    const handler = apiHandler(run);
    const response = await handler(post({}, {}), context);

    expect(response.status).toBe(403);
    expect(run).not.toHaveBeenCalled();
  });

  it("accepts state-changing requests with the CSRF header", async () => {
    const handler = apiHandler(async () => "created", { status: 201 });
    const response = await handler(post({}), context);

    expect(response.status).toBe(201);
  });

  it("skips the CSRF check when disabled (signed webhooks)", async () => {
    const handler = apiHandler(async () => "received", { csrf: false });
    const response = await handler(post({}, {}), context);

    expect(response.status).toBe(200);
  });

  it("returns field errors for an invalid body", async () => {
    const schema = z.object({ email: z.email() });
    const handler = apiHandler(async ({ req }) => parseJsonBody(req, schema));
    const response = await handler(post({ email: "not-an-email" }), context);
    const body = await readBody(response);

    expect(response.status).toBe(400);
    expect(body.error?.code).toBe("validation_error");
    expect(body.error?.fieldErrors?.email).toHaveLength(1);
  });

  it("returns a validation error for malformed JSON", async () => {
    const handler = apiHandler(async ({ req }) => parseJsonBody(req, z.object({})));
    const response = await handler(post("{not json"), context);

    expect(response.status).toBe(400);
    expect((await readBody(response)).error?.message).toBe("Request body must be valid JSON");
  });
});
