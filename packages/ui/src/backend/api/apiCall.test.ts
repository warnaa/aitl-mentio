import { describe, expect, it, vi } from "vitest";
import { apiCall, apiCallOrThrow, ApiError, CSRF_HEADER } from "./apiCall";

function mockFetch(response: Response | Error) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("apiCall", () => {
  it("sends the CSRF header, JSON body and query string", async () => {
    const fetchMock = mockFetch(json({ ok: true, data: { id: "1" } }, 201));

    const result = await apiCall<{ id: string }>("/api/things", {
      method: "POST",
      body: { name: "x" },
      query: { page: 2, skip: undefined },
    });

    expect(result).toEqual({ ok: true, data: { id: "1" }, status: 201 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(url).toBe("/api/things?page=2");
    expect(headers.get(CSRF_HEADER)).toBe("1");
    expect(headers.get("content-type")).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ name: "x" }));
  });

  it("returns the server error envelope with field errors", async () => {
    mockFetch(
      json({ ok: false, error: { code: "validation_error", message: "Invalid", fieldErrors: { email: ["Bad"] } } }, 400),
    );

    expect(await apiCall("/api/things")).toEqual({
      ok: false,
      status: 400,
      error: { code: "validation_error", message: "Invalid", fieldErrors: { email: ["Bad"] } },
    });
  });

  it.each([
    ["an HTML error page", new Response("<html>Internal Server Error</html>", { status: 500 })],
    ["an empty body", new Response(null, { status: 502 })],
    ["JSON that is not an envelope", json({ hello: "world" })],
  ])("reports %s as invalid_response", async (_label, response) => {
    mockFetch(response);
    const result = await apiCall("/api/things");

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("invalid_response");
  });

  it("reports network failures without throwing", async () => {
    mockFetch(new TypeError("Failed to fetch"));

    expect(await apiCall("/api/things")).toMatchObject({ ok: false, status: 0, error: { code: "network_error" } });
  });
});

describe("apiCallOrThrow", () => {
  it("returns data on success", async () => {
    mockFetch(json({ ok: true, data: [1, 2] }));

    await expect(apiCallOrThrow<number[]>("/api/things")).resolves.toEqual([1, 2]);
  });

  it("throws ApiError on failure", async () => {
    mockFetch(json({ ok: false, error: { code: "forbidden", message: "Nope" } }, 403));

    const error = await apiCallOrThrow("/api/things").catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 403, code: "forbidden", message: "Nope" });
  });
});
