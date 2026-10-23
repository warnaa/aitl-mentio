// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { CrudForm } from "./CrudForm";

const schema = z.object({
  email: z.email({ message: "Enter a valid email" }),
  name: z.string().min(2).optional(),
});

const fields = [
  { name: "email" as const, label: "Email", type: "email" as const },
  { name: "name" as const, label: "Name" },
];

afterEach(cleanup);

describe("CrudForm", () => {
  it("validates on the client with the shared schema before submitting", async () => {
    const onSubmit = vi.fn();
    render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Enter a valid email")).toBeTruthy();
    expect(screen.getByLabelText("Email").getAttribute("aria-invalid")).toBe("true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits parsed values, treating empty optional fields as undefined", async () => {
    const onSubmit = vi.fn(async () => ({ ok: true as const, data: { id: "1" }, status: 201 }));
    const onSuccess = vi.fn();
    render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ id: "1" }));
    expect(onSubmit).toHaveBeenCalledWith({ email: "ada@example.com" });
  });

  it("shows server field errors next to the matching field", async () => {
    const onSubmit = vi.fn(async () => ({
      ok: false as const,
      status: 409,
      error: { code: "conflict", message: "Could not save", fieldErrors: { email: ["Email already in use"] } },
    }));
    render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Email already in use")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe("Could not save");
  });

  it("submits on Cmd/Ctrl+Enter and cancels on Escape", async () => {
    const onSubmit = vi.fn(async () => ({ ok: true as const, data: null, status: 200 }));
    const onCancel = vi.fn();
    render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} onCancel={onCancel} />);
    const email = screen.getByLabelText("Email");

    fireEvent.change(email, { target: { value: "ada@example.com" } });
    fireEvent.keyDown(email, { key: "Enter", ctrlKey: true });
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());

    fireEvent.keyDown(email, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
