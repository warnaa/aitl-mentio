// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmptyState } from "./EmptyState";
import { ErrorMessage } from "./ErrorMessage";
import { LoadingMessage } from "./LoadingMessage";

afterEach(cleanup);

describe("EmptyState", () => {
  it("renders only the title by default", () => {
    const { container } = render(<EmptyState title="No users yet" />);

    expect(screen.getByText("No users yet")).toBeTruthy();
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });

  it("renders the description and action when given", () => {
    render(<EmptyState title="No users yet" description="Invite someone" action={<button>Invite</button>} />);

    expect(screen.getByText("Invite someone")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Invite" })).toBeTruthy();
  });
});

describe("ErrorMessage", () => {
  it("shows a default title and no retry button without onRetry", () => {
    render(<ErrorMessage message="Boom" />);

    expect(screen.getByRole("alert").textContent).toContain("Something went wrong");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("uses a custom title and calls onRetry", () => {
    const onRetry = vi.fn();
    render(<ErrorMessage title="Database unavailable" message="Boom" onRetry={onRetry} />);

    expect(screen.getByRole("alert").textContent).toContain("Database unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe("LoadingMessage", () => {
  it("announces a default or custom label", () => {
    render(<LoadingMessage />);
    expect(screen.getByRole("status").textContent).toBe("Loading…");
    cleanup();

    render(<LoadingMessage label="Fetching users" />);
    expect(screen.getByRole("status").textContent).toBe("Fetching users");
  });
});
