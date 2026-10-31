// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ActionButton } from "./ActionButton";

afterEach(cleanup);

const ok = { ok: true as const, data: { status: "published" }, status: 200 };
const failed = { ok: false as const, status: 400, error: { code: "validation_error", message: "Add a public-work link before publishing.", fieldErrors: { publicWorkLinks: ["Add at least one link"] } } };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

it("runs once while pending, keeps focus on the button and reports success", async () => {
  const pending = deferred<typeof ok>();
  const run = vi.fn(() => pending.promise);
  const onSuccess = vi.fn();
  render(<ActionButton label="Publish page" pendingLabel="Publishing…" run={run} onSuccess={onSuccess} />);
  const button = screen.getByRole("button", { name: "Publish page" });
  button.focus();
  fireEvent.click(button);
  fireEvent.click(button);
  expect(run).toHaveBeenCalledOnce();
  expect(button.textContent).toBe("Publishing…");
  expect(button.getAttribute("aria-disabled")).toBe("true");
  expect(button.getAttribute("aria-busy")).toBe("true");
  expect(document.activeElement).toBe(button);
  pending.resolve(ok);
  await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ status: "published" }));
  expect(button.textContent).toBe("Publish page");
});

it("shows the failure inline, calls onError once and clears it on the next run", async () => {
  const run = vi.fn().mockResolvedValueOnce(failed).mockResolvedValueOnce(ok);
  const onError = vi.fn();
  render(<ActionButton label="Publish page" run={run} onError={onError} />);
  fireEvent.click(screen.getByRole("button", { name: "Publish page" }));
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toBe("Add a public-work link before publishing.");
  expect(onError).toHaveBeenCalledOnce();
  expect(onError).toHaveBeenCalledWith(failed.error);
  expect(screen.getByRole("button", { name: "Publish page" }).getAttribute("aria-describedby")).toBe(alert.id);
  fireEvent.click(screen.getByRole("button", { name: "Publish page" }));
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
});

it("works without callbacks and shows the label while pending without a pending label", async () => {
  const pending = deferred<typeof failed>();
  render(<ActionButton label="Unpublish page" run={() => pending.promise} />);
  const button = screen.getByRole("button", { name: "Unpublish page" });
  fireEvent.click(button);
  expect(button.textContent).toBe("Unpublish page");
  pending.resolve(failed);
  expect(await screen.findByRole("alert")).toBeTruthy();
  const okRun = vi.fn(async () => ok);
  cleanup();
  render(<ActionButton label="Unpublish page" run={okRun} />);
  fireEvent.click(screen.getByRole("button", { name: "Unpublish page" }));
  await waitFor(() => expect(okRun).toHaveBeenCalledOnce());
});

it("explains why it is disabled", () => {
  const run = vi.fn();
  render(<ActionButton label="Publish page" run={run} disabled disabledReason="Save your changes before publishing." />);
  const button = screen.getByRole("button", { name: "Publish page" }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  expect(document.getElementById(button.getAttribute("aria-describedby")!)!.textContent).toBe("Save your changes before publishing.");
  fireEvent.click(button);
  expect(run).not.toHaveBeenCalled();
  cleanup();
  render(<ActionButton label="Publish page" run={run} disabled />);
  expect(screen.getByRole("button", { name: "Publish page" }).getAttribute("aria-describedby")).toBeNull();
});

const confirm = { title: "Remove the slot on 6 November 2026 at 18:00?", description: "Mentees will no longer see this time.", confirmLabel: "Remove slot", cancelLabel: "Keep slot" };

it("asks first, keeps the dialog open while pending, then closes it", async () => {
  const pending = deferred<typeof ok>();
  const run = vi.fn(() => pending.promise);
  render(<ActionButton label="Remove slot" pendingLabel="Removing slot…" variant="destructive" run={run} confirm={confirm} />);
  fireEvent.click(screen.getByRole("button", { name: "Remove slot" }));
  const dialog = await screen.findByRole("alertdialog", { name: confirm.title });
  expect(run).not.toHaveBeenCalled();
  const action = screen.getAllByRole("button", { name: "Remove slot" }).find((button) => dialog.contains(button))!;
  fireEvent.click(action);
  fireEvent.click(action);
  expect(run).toHaveBeenCalledOnce();
  expect(action.textContent).toBe("Removing slot…");
  expect((screen.getByRole("button", { name: "Keep slot" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(screen.getByRole("alertdialog")).toBeTruthy();
  fireEvent.click(screen.getAllByRole("button", { name: /Remove slot|Removing slot/ })[0]);
  expect(run).toHaveBeenCalledOnce();
  pending.resolve(ok);
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
});

it("cancels without running, and uses the confirm label while pending without a pending label", async () => {
  const pending = deferred<typeof failed>();
  const run = vi.fn(() => pending.promise);
  render(<ActionButton label="Remove slot" run={run} confirm={confirm} />);
  fireEvent.click(screen.getByRole("button", { name: "Remove slot" }));
  fireEvent.click(await screen.findByRole("button", { name: "Keep slot" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(run).not.toHaveBeenCalled();
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Remove slot" })));
  fireEvent.click(screen.getByRole("button", { name: "Remove slot" }));
  const dialog = await screen.findByRole("alertdialog");
  const action = screen.getAllByRole("button", { name: "Remove slot" }).find((button) => dialog.contains(button))!;
  fireEvent.click(action);
  expect(action.textContent).toBe("Remove slot");
  pending.resolve(failed);
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByRole("alertdialog")).toBeNull();
});
