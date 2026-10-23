// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import UsersPage from "./page";

vi.mock("./users-table", () => ({ UsersTable: () => <p>users table</p> }));

afterEach(cleanup);

describe("UsersPage", () => {
  it("renders the heading and the users table", () => {
    render(<UsersPage />);

    expect(screen.getByRole("heading", { name: "Users" })).toBeTruthy();
    expect(screen.getByText("users table")).toBeTruthy();
  });
});
