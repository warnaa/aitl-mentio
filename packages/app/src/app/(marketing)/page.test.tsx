// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import HomePage from "./page";

afterEach(cleanup);

describe("HomePage", () => {
  it("renders the welcome copy and links to the admin area", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: "Welcome to Mentio." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open admin" }).getAttribute("href")).toBe("/admin");
  });
});
