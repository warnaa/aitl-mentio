// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UsersTable } from "./users-table";

const user = (index: number) => ({
  id: `00000000-0000-4000-8000-00000000000${index}`,
  email: `user${index}@example.com`,
  name: index === 1 ? null : `User ${index}`,
  createdAt: "2026-10-23T05:41:24.318Z",
});

function respondWith(...bodies: Array<[unknown, number]>) {
  const fetchMock = vi.fn();
  for (const [body, status] of bodies) {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(cleanup);

describe("UsersTable", () => {
  it("renders users from /api/users and pages through them", async () => {
    const fetchMock = respondWith(
      [{ ok: true, data: { items: [user(1)], total: 21, limit: 20, offset: 0 } }, 200],
      [{ ok: true, data: { items: [user(2)], total: 21, limit: 20, offset: 20 } }, 200],
    );
    render(<UsersTable />);

    expect(await screen.findByText("user1@example.com")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/users?limit=20&offset=0");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("user2@example.com")).toBeTruthy();
    expect(fetchMock.mock.calls[1][0]).toBe("/api/users?limit=20&offset=20");
  });

  it("asks the user to sign in on 401 and retries on demand", async () => {
    respondWith(
      [{ ok: false, error: { code: "unauthorized", message: "Authentication required" } }, 401],
      [{ ok: true, data: { items: [], total: 0, limit: 20, offset: 0 } }, 200],
    );
    render(<UsersTable />);

    expect(await screen.findByText("Sign in to view users.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("No users yet")).toBeTruthy();
  });

  it("shows the API error message for other failures", async () => {
    respondWith([{ ok: false, error: { code: "internal_error", message: "Something went wrong" } }, 500]);
    render(<UsersTable />);

    expect(await screen.findAllByText("Something went wrong")).not.toHaveLength(0);
  });

  it("ignores a response that arrives after unmounting", async () => {
    let resolve: (response: Response) => void = () => {};
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((settle) => (resolve = settle))));
    const { unmount } = render(<UsersTable />);
    const consoleError = vi.spyOn(console, "error");

    unmount();
    resolve(new Response(JSON.stringify({ ok: true, data: { items: [user(1)], total: 1, limit: 20, offset: 0 } })));
    await new Promise((settle) => setTimeout(settle, 0));

    expect(consoleError).not.toHaveBeenCalled();
  });
});
