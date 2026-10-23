// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import AdminLayout from "./layout";

afterEach(cleanup);

describe("AdminLayout", () => {
  it("renders the navigation and the page content", () => {
    render(
      <AdminLayout>
        <p>page content</p>
      </AdminLayout>,
    );

    expect(screen.getByRole("link", { name: "Dashboard" }).getAttribute("href")).toBe("/admin");
    expect(screen.getByRole("link", { name: "Users" }).getAttribute("href")).toBe("/admin/users");
    expect(screen.getByText("page content")).toBeTruthy();
  });
});
