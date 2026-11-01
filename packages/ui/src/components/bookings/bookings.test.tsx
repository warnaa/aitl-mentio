// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { BookingSummary } from "./BookingSummary";

afterEach(cleanup);

const facts = [{ term: "Time", detail: "Thursday, 6 November, 18:00 (Warsaw time)" }, { term: "Length", detail: "50 minutes" }, { term: "Price", detail: "240 zł" }];

it("shows the status, facts as a description list, the question and the text-only note", () => {
  render(<BookingSummary title="Booking with Alex" status={{ tone: "waiting", label: "Awaiting payment" }} facts={facts}
    question={{ heading: "Your question", text: "kubectl logs\n  W1031 Service has no Endpoint" }} textOnlyNote="The session takes place in text only." />);
  expect(screen.getByRole("heading", { level: 2, name: "Booking with Alex" })).toBeTruthy();
  expect(screen.getByText("Awaiting payment").getAttribute("data-tone")).toBe("waiting");
  const terms = screen.getAllByRole("term").map((term) => term.textContent);
  expect(terms).toEqual(["Time", "Length", "Price"]);
  expect(screen.getAllByRole("definition")[2].textContent).toBe("240 zł");
  const question = screen.getByRole("region", { name: "Your question" });
  expect(within(question).getByText(/W1031/).textContent).toBe("kubectl logs\n  W1031 Service has no Endpoint");
  expect(screen.getByText("The session takes place in text only.")).toBeTruthy();
});

it("keeps the outline: the question heading is one level below the title", () => {
  const { unmount } = render(<BookingSummary title="Booking with Alex" facts={facts} question={{ heading: "Your question", text: "Ingress is down" }} textOnlyNote="Text only." />);
  expect(screen.getByRole("heading", { level: 3, name: "Your question" })).toBeTruthy();
  unmount();
  render(<BookingSummary title="Booking with Alex" headingLevel={1} facts={facts} question={{ heading: "Your question", text: "Ingress is down" }} textOnlyNote="Text only." />);
  expect(screen.getByRole("heading", { level: 2, name: "Your question" })).toBeTruthy();
});

it("can be the page heading and omits status and question", () => {
  render(<BookingSummary title="Booking with Alex" headingLevel={1} facts={facts} textOnlyNote="Text only." />);
  expect(screen.getByRole("heading", { level: 1, name: "Booking with Alex" })).toBeTruthy();
  expect(screen.queryByRole("region")).toBeNull();
  expect(document.querySelector("[data-tone]")).toBeNull();
});
