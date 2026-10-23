// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminPage from "./page";

const { withScope, logError } = vi.hoisted(() => ({ withScope: vi.fn(), logError: vi.fn() }));
vi.mock("@mentio/core/container", () => ({ withScope }));
vi.mock("@mentio/core/logger", () => ({ getLogger: () => ({ error: logError }) }));

afterEach(cleanup);

describe("AdminPage", () => {
  it("shows the user count from the user service", async () => {
    const count = vi.fn().mockResolvedValue(42);
    withScope.mockImplementation((fn) => fn({ userService: { count } }));

    render(await AdminPage());

    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByText("Connected")).toBeTruthy();
    expect(count).toHaveBeenCalledOnce();
  });

  it("logs the failure and shows a generic message when the database is unavailable", async () => {
    const failure = new Error("connect ECONNREFUSED");
    withScope.mockRejectedValue(failure);

    render(await AdminPage());

    expect(screen.getByText("Database unavailable")).toBeTruthy();
    expect(screen.queryByText(/ECONNREFUSED/)).toBeNull();
    expect(logError).toHaveBeenCalledWith({ err: failure }, "Admin dashboard: failed to load");
  });
});
