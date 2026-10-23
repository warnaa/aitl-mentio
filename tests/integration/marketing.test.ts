import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { Browser } from "./support/browser";

describe("marketing home page", () => {
  const browser = new Browser();
  const baseUrl = inject("baseUrl");

  beforeAll(() => browser.open(`${baseUrl}/`));
  afterAll(() => browser.close());

  it("renders the welcome heading and links to the admin area", async () => {
    expect(await browser.title()).toBe("Mentio");
    expect(await browser.text("h1")).toBe("Welcome to Mentio.");
    expect(await browser.text("a[href='/admin']")).toBe("Open admin");
  });
});
