// @vitest-environment jsdom
import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Message } from "./Message";
import { MessageComposer, type MessageComposerReply } from "./MessageComposer";
import type { ApiResult } from "../../backend/api/types";

afterEach(cleanup);

const base = { id: "message-2", author: "Alex", role: "Mentor", dateTime: "2026-11-06T17:04:00Z", time: "18:04" };

it("shows author, role and time, and is the named target of reply links", () => {
  render(<Message {...base} body="Check the Service selector first." />);
  const article = screen.getByRole("article", { name: "Alex Mentor 18:04" });
  expect(article.id).toBe("message-2");
  expect(article.tabIndex).toBe(-1);
  expect(within(article).getByText("18:04").getAttribute("datetime")).toBe("2026-11-06T17:04:00Z");
  expect(within(article).queryByRole("button")).toBeNull();
});

it("renders fenced blocks and inline code in the code role and keeps text line breaks", () => {
  const body = "Run this:\n```bash\nkubectl get endpoints shop-api\n```\nThen open `values.yaml`.\nLine two\n```unclosed";
  const { container } = render(<Message {...base} body={body} />);
  const code = container.querySelector("pre.mentio-message-code > code");
  expect(code?.textContent).toBe("kubectl get endpoints shop-api");
  expect(container.querySelector("code.mentio-message-inline-code")?.textContent).toBe("values.yaml");
  const paragraphs = Array.from(container.querySelectorAll("p.mentio-message-text")).map((p) => p.textContent);
  expect(paragraphs).toEqual(["Run this:", "Then open values.yaml.\nLine two\n```unclosed"]);
});

it("drops empty text around a block and shows a preformatted body as typed", () => {
  const { container, unmount } = render(<Message {...base} body={"```\nonly code\n```"} />);
  expect(container.querySelectorAll("p.mentio-message-text")).toHaveLength(0);
  expect(container.querySelector("pre")?.textContent).toBe("only code");
  unmount();
  const question = "The ingress stopped.\n\n```not parsed```";
  const { container: preformatted } = render(<Message {...base} role={undefined} body={question} preformatted />);
  const text = preformatted.querySelector("p.mentio-message-preformatted");
  expect(text?.textContent).toBe(question);
  expect(preformatted.querySelector("pre")).toBeNull();
  expect(screen.getByRole("article", { name: "Alex 18:04" })).toBeTruthy();
});

it("quotes the answered message with a link back and offers Reply described by the message", () => {
  const onReply = vi.fn();
  render(<Message {...base} body="Yes, that was it." replyTo={{ author: "Kasia", excerpt: "Should I check the Endpoints?", href: "#message-1", goToLabel: "Go to Kasia’s message" }} reply={{ label: "Reply", onReply }} />);
  expect(screen.getByText("Should I check the Endpoints?")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Go to Kasia’s message" }).getAttribute("href")).toBe("#message-1");
  const reply = screen.getByRole("button", { name: "Reply" });
  expect(reply.getAttribute("aria-describedby")).toBe(screen.getByRole("article").getAttribute("aria-labelledby"));
  expect(reply.getAttribute("aria-describedby")?.split(" ")).toHaveLength(3);
  fireEvent.click(reply);
  expect(onReply).toHaveBeenCalledOnce();
});

const composerProps = { label: "Your message", description: "Ctrl+Enter sends.", sendLabel: "Send", pendingLabel: "Sending…", emptyError: "Write a message first" };

function deferred() {
  let resolve!: (value: ApiResult<unknown>) => void;
  const promise = new Promise<ApiResult<unknown>>((done) => { resolve = done; });
  return { promise, resolve };
}

it("refuses an empty message, marks the field invalid and announces why", () => {
  const onSend = vi.fn();
  render(<MessageComposer {...composerProps} onSend={onSend} />);
  const field = screen.getByLabelText(/Your message/);
  fireEvent.change(field, { target: { value: "   " } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  expect(onSend).not.toHaveBeenCalled();
  expect(screen.getByRole("alert").textContent).toBe("Write a message first");
  expect(field.getAttribute("aria-invalid")).toBe("true");
  expect(field.getAttribute("aria-describedby")).toContain(screen.getByRole("alert").id);
  expect(document.activeElement).toBe(field);
});

it("sends the trimmed text once, blocks a second send while pending and clears after confirmation", async () => {
  const pending = deferred();
  const onSend = vi.fn(() => pending.promise);
  const onSent = vi.fn();
  render(<MessageComposer {...composerProps} onSend={onSend} onSent={onSent} />);
  const field = screen.getByLabelText(/Your message/) as HTMLTextAreaElement;
  fireEvent.change(field, { target: { value: "  It works now.  " } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  const button = screen.getByRole("button", { name: "Sending…" });
  expect(button.getAttribute("aria-disabled")).toBe("true");
  expect(field.readOnly).toBe(true);
  fireEvent.click(button);
  expect(onSend).toHaveBeenCalledTimes(1);
  expect(onSend).toHaveBeenCalledWith("It works now.");
  await act(async () => pending.resolve({ ok: true, data: { id: "message-9" }, status: 201 }));
  expect(field.value).toBe("");
  expect(onSent).toHaveBeenCalledWith({ id: "message-9" });
  expect(screen.queryByRole("alert")).toBeNull();
});

it("keeps the text and announces a failed send without marking the field invalid", async () => {
  const onSend = vi.fn(async (): Promise<ApiResult<unknown>> => ({ ok: false, error: { code: "network_error", message: "Check your connection, then try again." }, status: 0 }));
  render(<MessageComposer {...composerProps} onSend={onSend} />);
  const field = screen.getByLabelText(/Your message/) as HTMLTextAreaElement;
  fireEvent.change(field, { target: { value: "kubectl rollout restart deploy/api" } });
  await act(async () => { fireEvent.keyDown(field, { key: "Enter", ctrlKey: true }); });
  expect(screen.getByRole("alert").textContent).toBe("Check your connection, then try again.");
  expect(field.value).toBe("kubectl rollout restart deploy/api");
  expect(field.getAttribute("aria-invalid")).toBeNull();
  expect(document.activeElement).toBe(field);
});

it("sends with Cmd+Enter, while plain Enter keeps writing", async () => {
  const onSend = vi.fn(async (): Promise<ApiResult<unknown>> => ({ ok: true, data: null, status: 201 }));
  render(<MessageComposer {...composerProps} onSend={onSend} />);
  const field = screen.getByLabelText(/Your message/);
  fireEvent.change(field, { target: { value: "line one" } });
  fireEvent.keyDown(field, { key: "Enter" });
  fireEvent.keyDown(field, { key: "a", metaKey: true });
  expect(onSend).not.toHaveBeenCalled();
  await act(async () => { fireEvent.keyDown(field, { key: "Enter", metaKey: true }); });
  expect(onSend).toHaveBeenCalledWith("line one");
});

function ReplyHarness() {
  const [reply, setReply] = useState<MessageComposerReply | undefined>(undefined);
  const start = (id: string) => setReply({ id, heading: "Replying to Alex", excerpt: `Excerpt ${id}`, cancelLabel: "Cancel reply", onCancel: () => setReply(undefined) });
  return <>
    <button type="button" onClick={() => start("message-2")}>Reply 2</button>
    <button type="button" onClick={() => start("message-4")}>Reply 4</button>
    <MessageComposer {...composerProps} description={undefined} replyTo={reply} onSend={async () => ({ ok: true, data: null, status: 201 })} />
  </>;
}

it("shows the quoted message, moves focus to the field, and cancels the reply back to the field", () => {
  render(<ReplyHarness />);
  const field = screen.getByLabelText(/Your message/);
  expect(field.getAttribute("aria-describedby")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Reply 2" }));
  expect(screen.getByText("Excerpt message-2")).toBeTruthy();
  expect(document.activeElement).toBe(field);
  expect(document.getElementById(field.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Replying to Alex");
  screen.getByRole("button", { name: "Reply 4" }).focus();
  fireEvent.click(screen.getByRole("button", { name: "Reply 4" }));
  expect(screen.getByText("Excerpt message-4")).toBeTruthy();
  expect(document.activeElement).toBe(field);
  fireEvent.click(screen.getByRole("button", { name: "Cancel reply" }));
  expect(screen.queryByText("Excerpt message-4")).toBeNull();
  expect(document.activeElement).toBe(field);
});

it("joins the reply heading and the hint in the description, without taking focus on the first render", () => {
  render(<MessageComposer {...composerProps} replyTo={{ id: "message-2", heading: "Replying to Alex", excerpt: "Check the selector", cancelLabel: "Cancel reply", onCancel: () => {} }} onSend={async () => ({ ok: true, data: null, status: 201 })} />);
  const field = screen.getByLabelText(/Your message/);
  expect(document.getElementById(field.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Replying to Alex. Ctrl+Enter sends.");
  expect(document.activeElement).toBe(document.body);
});
