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

  it("prefills initial values, renders textareas and descriptions, and uses a custom label", () => {
    const bioSchema = z.object({ bio: z.string().optional(), age: z.coerce.number().optional() });
    render(
      <CrudForm
        schema={bioSchema}
        fields={[
          { name: "bio", label: "Bio", type: "textarea", description: "A short intro" },
          { name: "age", label: "Age", type: "number" },
        ]}
        initialValues={{ bio: "Hi", age: null }}
        submitLabel="Create"
        onSubmit={vi.fn()}
      />,
    );

    const bio = screen.getByLabelText("Bio");
    expect(bio.tagName).toBe("TEXTAREA");
    expect((bio as HTMLTextAreaElement).value).toBe("Hi");
    expect((screen.getByLabelText("Age") as HTMLInputElement).value).toBe("");
    expect(screen.getByText("A short intro")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create" })).toBeTruthy();
  });

  it("hides the description while the field shows an error", async () => {
    render(
      <CrudForm
        schema={schema}
        fields={[{ name: "email", label: "Email", description: "We never share it" }]}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByLabelText("Email", { selector: "[aria-invalid=true]" });
    expect(screen.queryByText("We never share it")).toBeNull();
  });

  it("shows a server error without field errors and works without onSuccess", async () => {
    const onSubmit = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, error: { code: "internal_error", message: "Try later" } })
      .mockResolvedValueOnce({ ok: true, data: null, status: 200 });
    render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Try later");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("disables the form while saving and ignores a second submit", async () => {
    let resolve!: (value: { ok: true; data: null; status: number }) => void;
    const onSubmit = vi.fn(() => new Promise<{ ok: true; data: null; status: number }>((r) => (resolve = r)));
    const onCancel = vi.fn();
    const { container } = render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} onCancel={onCancel} />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const saving = await screen.findByRole("button", { name: "Saving…" });
    expect((saving as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(container.querySelector("form")!);
    expect(onSubmit).toHaveBeenCalledOnce();

    resolve({ ok: true, data: null, status: 200 });
    expect(await screen.findByRole("button", { name: "Save" })).toBeTruthy();
  });

  it("submits on Cmd+Enter, ignores plain Enter, and cancels via the Cancel button", async () => {
    const onSubmit = vi.fn(async () => ({ ok: true as const, data: null, status: 200 }));
    const onCancel = vi.fn();
    render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} onCancel={onCancel} />);
    const email = screen.getByLabelText("Email");
    fireEvent.change(email, { target: { value: "ada@example.com" } });

    fireEvent.keyDown(email, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(email, { key: "Enter", metaKey: true });
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("ignores Escape without onCancel and renders fields added after mount as empty", () => {
    const { rerender } = render(<CrudForm schema={schema} fields={[fields[0]]} onSubmit={vi.fn()} />);
    const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    screen.getByLabelText("Email").dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();

    rerender(<CrudForm schema={schema} fields={fields} onSubmit={vi.fn()} />);
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("");
  });
});

