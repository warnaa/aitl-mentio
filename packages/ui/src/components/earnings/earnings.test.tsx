// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { EarningsSummary } from "./EarningsSummary";

afterEach(cleanup);

const lines = { price: { term: "Price", amount: "240 zł" }, commission: { term: "Mentio’s commission (20%)", amount: "−48 zł" }, share: { term: "Your share", amount: "192 zł" } };

it("shows price, commission and share in that order, with the share as the result line", () => {
  render(<EarningsSummary title="Your earnings" context="6 settled sessions" {...lines} note="Simulated — no money is paid out yet." />);
  expect(screen.getByRole("heading", { level: 2, name: "Your earnings" })).toBeTruthy();
  expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual(["Price", "Mentio’s commission (20%)", "Your share"]);
  expect(screen.getAllByRole("definition").map((amount) => amount.textContent)).toEqual(["240 zł", "−48 zł", "192 zł"]);
  expect(screen.getByText("Your share").parentElement?.className).toContain("mentio-earnings-share");
  expect(screen.getByText("6 settled sessions")).toBeTruthy();
  expect(screen.getByText("Simulated — no money is paid out yet.")).toBeTruthy();
});

it("omits context and note when a single session needs neither", () => {
  const { container } = render(<EarningsSummary title="Earnings for this session" {...lines} />);
  expect(screen.getByRole("heading", { level: 2, name: "Earnings for this session" })).toBeTruthy();
  expect(container.querySelectorAll(".mentio-earnings-body > p")).toHaveLength(0);
});
