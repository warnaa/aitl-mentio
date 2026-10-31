// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { CrudForm, type CrudField } from "./CrudForm";

afterEach(cleanup);
// Radix form controls measure themselves; jsdom has no ResizeObserver.
beforeEach(() => vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} }));

const ok = { ok: true as const, data: null, status: 200 };

describe("CrudForm validation and focus", () => {
  const schema = z.object({
    email: z.email({ message: "Enter a valid email address" }),
    name: z.string().min(2, { message: "Enter at least 2 characters" }).optional(),
  });
  const fields = [
    { name: "email" as const, label: "Email address", description: "Use your account email." },
    { name: "name" as const, label: "Name" },
  ];

  it("validates a field when it loses focus and re-checks it while the error is shown", () => {
    render(<CrudForm schema={schema} fields={fields} onSubmit={vi.fn()} />);
    const email = screen.getByLabelText("Email address");

    fireEvent.blur(email);
    expect(screen.getByText("Enter a valid email address")).toBeTruthy();
    expect(screen.queryByText("Use your account email.")).toBeNull();
    expect(email.getAttribute("aria-invalid")).toBe("true");

    fireEvent.change(email, { target: { value: "alex@example.test" } });
    expect(screen.queryByText("Enter a valid email address")).toBeNull();
    expect(screen.getByText("Use your account email.")).toBeTruthy();
    expect(email.getAttribute("aria-describedby")).toContain("description");
  });

  it("does not re-check a field without an error on change, and blur clears a fixed error", () => {
    render(<CrudForm schema={schema} fields={fields} onSubmit={vi.fn()} />);
    const name = screen.getByLabelText("Name");
    fireEvent.change(name, { target: { value: "A" } });
    expect(screen.queryByText("Enter at least 2 characters")).toBeNull();
    fireEvent.blur(name);
    expect(screen.getByText("Enter at least 2 characters")).toBeTruthy();
    fireEvent.change(name, { target: { value: "Alex" } });
    fireEvent.blur(name);
    expect(screen.queryByText("Enter at least 2 characters")).toBeNull();
  });

  it("marks required and optional fields from the schema without changing the label name", () => {
    const { container } = render(<CrudForm schema={schema} fields={fields} onSubmit={vi.fn()} />);
    const markers = [...container.querySelectorAll(".mentio-field-requirement")].map((marker) => marker.textContent);
    expect(markers).toEqual(["Required", "Optional"]);
    expect((screen.getByLabelText("Email address") as HTMLInputElement).required).toBe(true);
    expect((screen.getByLabelText("Name") as HTMLInputElement).required).toBe(false);
  });

  it("focuses the first invalid field in field order after a failed client submit", async () => {
    render(<CrudForm schema={schema} fields={fields} onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Email address")));
  });

  it("keeps entered values and focuses the server field error once fields are enabled again", async () => {
    const onSubmit = vi.fn(async () => ({
      ok: false as const,
      status: 409,
      error: { code: "email_taken", message: "Check the highlighted field.", fieldErrors: { email: ["This email address is already taken"] } },
    }));
    render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "alex@example.test" } });
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Alex" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("This email address is already taken")).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Email address")));
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Alex");
  });

  it("focuses the form-level alert when the server error names no field", async () => {
    const onSubmit = vi.fn(async () => ({ ok: false as const, status: 0, error: { code: "network_error", message: "Check your connection, then try again." } }));
    render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "alex@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const alert = await screen.findByRole("alert");
    await waitFor(() => expect(document.activeElement).toBe(alert));
  });

  it("moves no focus when client errors name no visible field", async () => {
    const hidden = z.object({ email: z.string().optional(), token: z.string() });
    render(<CrudForm schema={hidden} fields={[{ name: "email", label: "Email address" }]} onSubmit={vi.fn()} />);
    const before = document.activeElement;
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await act(async () => {});
    expect(document.activeElement).toBe(before);
  });

  it("shows external errors until a local result replaces them", () => {
    const { rerender } = render(<CrudForm schema={schema} fields={fields} externalFieldErrors={{ name: ["Add a name before publishing"] }} onSubmit={vi.fn()} />);
    expect(screen.getByText("Add a name before publishing")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "A" } });
    fireEvent.blur(screen.getByLabelText("Name"));
    expect(screen.getByText("Enter at least 2 characters")).toBeTruthy();
    expect(screen.queryByText("Add a name before publishing")).toBeNull();
    rerender(<CrudForm schema={schema} fields={fields} onSubmit={vi.fn()} />);
    expect(screen.queryByText("Add a name before publishing")).toBeNull();
  });

  it("reports a missing schema entry as optional", () => {
    const loose = z.object({ email: z.string() });
    const extra = [{ name: "email", label: "Email address" }, { name: "nickname", label: "Nickname" }] as CrudField<"email">[];
    const { container } = render(<CrudForm schema={loose} fields={extra} onSubmit={vi.fn()} />);
    expect([...container.querySelectorAll(".mentio-field-requirement")].map((marker) => marker.textContent)).toEqual(["Required", "Optional"]);
  });
});

describe("CrudForm field kinds", () => {
  it("submits a checkbox as a boolean and prefills it", async () => {
    const schema = z.object({ isListed: z.boolean() });
    const onSubmit = vi.fn(async () => ok);
    render(<CrudForm schema={schema} fields={[{ name: "isListed", label: "Show me in the mentor list", type: "checkbox", description: "Your page stays reachable through its share link." }]} onSubmit={onSubmit} />);
    const box = screen.getByRole("checkbox", { name: "Show me in the mentor list" });
    expect(box.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(box);
    fireEvent.blur(box);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ isListed: true }));
    cleanup();
    render(<CrudForm schema={schema} fields={[{ name: "isListed", label: "Listed", type: "checkbox" }]} initialValues={{ isListed: true }} onSubmit={onSubmit} />);
    expect(screen.getByRole("checkbox", { name: "Listed" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("checkbox", { name: "Listed" }));
    expect(screen.getByRole("checkbox", { name: "Listed" }).getAttribute("aria-checked")).toBe("false");
  });

  it("renders a select with priced options and ignores blur into its own list", async () => {
    const schema = z.object({ lengthMinutes: z.enum(["25", "50"], { message: "Choose 25 or 50 minutes" }) });
    const onSubmit = vi.fn(async () => ok);
    const { container } = render(
      <CrudForm
        schema={schema}
        fields={[{ name: "lengthMinutes", label: "Session length", type: "select", placeholder: "Choose a length", options: [{ value: "25", label: "25 minutes — 120 zł" }, { value: "50", label: "50 minutes — 240 zł" }] }]}
        onSubmit={onSubmit}
      />,
    );
    const trigger = screen.getByRole("combobox", { name: "Session length" });
    expect(trigger.getAttribute("aria-required")).toBe("true");
    expect(trigger.hasAttribute("required")).toBe(false);

    const list = document.createElement("div");
    list.setAttribute("role", "listbox");
    const option = document.createElement("div");
    list.append(option);
    document.body.append(list);
    fireEvent.blur(trigger, { relatedTarget: option });
    expect(screen.queryByText("Choose 25 or 50 minutes")).toBeNull();
    list.remove();
    fireEvent.blur(trigger, { relatedTarget: null });
    expect(screen.getByText("Choose 25 or 50 minutes")).toBeTruthy();

    fireEvent.change(container.querySelector("select")!, { target: { value: "50" } });
    await waitFor(() => expect(screen.queryByText("Choose 25 or 50 minutes")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ lengthMinutes: "50" }));
  });

  it("renders a select without options", () => {
    const schema = z.object({ lengthMinutes: z.string().optional() });
    render(<CrudForm schema={schema} fields={[{ name: "lengthMinutes", label: "Session length", type: "select" }]} onSubmit={vi.fn()} />);
    expect(screen.getByRole("combobox", { name: "Session length" })).toBeTruthy();
  });

  it("renders a money field with a linked unit and converts through the schema", async () => {
    const schema = z.object({ ratePln: z.coerce.number().int().min(90).max(600) });
    const onSubmit = vi.fn(async () => ok);
    const { rerender } = render(<CrudForm schema={schema} fields={[{ name: "ratePln", label: "Rate per 25 minutes", type: "money" }]} onSubmit={onSubmit} />);
    const rate = screen.getByLabelText("Rate per 25 minutes") as HTMLInputElement;
    expect(rate.inputMode).toBe("numeric");
    const suffix = document.getElementById(rate.getAttribute("aria-describedby")!.split(" ")[0])!;
    expect(suffix.textContent).toBe("zł");
    fireEvent.change(rate, { target: { value: "120" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ ratePln: 120 }));
    rerender(<CrudForm schema={schema} fields={[{ name: "ratePln", label: "Rate", type: "money", suffix: "PLN" }]} onSubmit={onSubmit} />);
    expect(screen.getByText("PLN")).toBeTruthy();
  });

  it("renders a native date-time field with a 15-minute step unless another step is given", () => {
    const schema = z.object({ startsAt: z.string(), endsAt: z.string().optional() });
    render(<CrudForm schema={schema} fields={[{ name: "startsAt", label: "Session start, Warsaw time", type: "datetime" }, { name: "endsAt", label: "End", type: "datetime", step: 3600 }]} onSubmit={vi.fn()} />);
    const start = screen.getByLabelText("Session start, Warsaw time") as HTMLInputElement;
    expect(start.type).toBe("datetime-local");
    expect(start.step).toBe("900");
    expect((screen.getByLabelText("End") as HTMLInputElement).step).toBe("3600");
  });

  describe("urlList", () => {
    const schema = z.object({ links: z.array(z.string()).transform((rows) => rows.filter(Boolean)).pipe(z.array(z.url()).min(1, { message: "Add at least one public-work link" })) });
    const field = { name: "links" as const, label: "Public work", type: "urlList" as const, max: 3, description: "Up to 3 links." };

    it("adds, edits and removes rows with focus following the change, up to the maximum", async () => {
      const onSubmit = vi.fn(async () => ok);
      render(<CrudForm schema={schema} fields={[field]} initialValues={{ links: ["https://example.test/alex/talk"] }} onSubmit={onSubmit} />);
      expect((screen.getByRole("textbox", { name: "Link 1" }) as HTMLInputElement).value).toBe("https://example.test/alex/talk");

      fireEvent.click(screen.getByRole("button", { name: "Add link" }));
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Link 2" })));
      fireEvent.change(screen.getByRole("textbox", { name: "Link 2" }), { target: { value: "https://example.test/alex/notes" } });
      fireEvent.click(screen.getByRole("button", { name: "Add link" }));
      expect((screen.getByRole("button", { name: "Add link" }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.getByRole("button", { name: "Add link" }).getAttribute("aria-describedby")).toContain("description");

      fireEvent.click(screen.getByRole("button", { name: "Remove link 3" }));
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Link 2" })));
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ links: ["https://example.test/alex/talk", "https://example.test/alex/notes"] }));
    });

    it("keeps one empty row, shows list errors under the list and focuses the first row", async () => {
      render(<CrudForm schema={schema} fields={[{ ...field, itemLabel: "Work", addLabel: "Add work", removeLabel: "Remove work", description: undefined }]} onSubmit={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: "Remove work 1" }));
      expect(screen.getAllByRole("textbox")).toHaveLength(1);
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(await screen.findByText("Add at least one public-work link")).toBeTruthy();
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Work 1" })));
      expect(screen.getByRole("group", { name: /Public work/ }).getAttribute("aria-describedby")).toContain("error");
      expect(screen.getByRole("button", { name: "Add work" }).getAttribute("aria-describedby")).toBeNull();
    });

    it("treats a list field added after mount as one empty row", () => {
      const { rerender } = render(<CrudForm schema={schema} fields={[]} onSubmit={vi.fn()} />);
      rerender(<CrudForm schema={schema} fields={[field]} onSubmit={vi.fn()} />);
      expect(screen.getAllByRole("textbox")).toHaveLength(1);
    });
  });
});

describe("CrudForm dirty state", () => {
  const schema = z.object({ displayName: z.string().min(1) });
  const fields = [{ name: "displayName" as const, label: "Display name" }];

  it("reports dirty changes once, and clean again after a successful save", async () => {
    const onDirtyChange = vi.fn();
    render(<CrudForm schema={schema} fields={fields} initialValues={{ displayName: "Alex" }} onDirtyChange={onDirtyChange} onSubmit={vi.fn(async () => ok)} />);
    const name = screen.getByLabelText("Display name");
    fireEvent.change(name, { target: { value: "Alex K." } });
    fireEvent.change(name, { target: { value: "Alex Ko" } });
    expect(onDirtyChange).toHaveBeenCalledTimes(1);
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));
  });

  it("adopts refreshed values while clean and keeps unsaved input while dirty", () => {
    const { rerender } = render(<CrudForm schema={schema} fields={fields} initialValues={{ displayName: "Alex" }} onSubmit={vi.fn()} />);
    rerender(<CrudForm schema={schema} fields={fields} initialValues={{ displayName: "Alex from another tab" }} onSubmit={vi.fn()} />);
    const name = screen.getByLabelText("Display name") as HTMLInputElement;
    expect(name.value).toBe("Alex from another tab");
    fireEvent.change(name, { target: { value: "My unsaved edit" } });
    rerender(<CrudForm schema={schema} fields={fields} initialValues={{ displayName: "Another refresh" }} onSubmit={vi.fn()} />);
    expect(name.value).toBe("My unsaved edit");
  });
});
