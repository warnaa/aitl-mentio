import { afterAll, afterEach, beforeAll, describe, expect, inject, it } from "vitest";
import { Browser } from "./support/browser";
import { closeOrm, countUsers, seedUser } from "./support/db";
import { sessionCookie } from "./support/session";

describe("admin panel", () => {
  const baseUrl = inject("baseUrl");
  let browser: Browser;

  beforeAll(() => seedUser("Grace Hopper"));
  afterAll(() => closeOrm());
  afterEach(async (context) => {
    if (context.task.result?.state === "fail") await browser.screenshot(context.task.name.replaceAll(" ", "-"));
    await browser.close();
  });

  it("dashboard shows the live user count from the database", async () => {
    browser = new Browser();
    await browser.open(`${baseUrl}/admin`);

    expect(await browser.text("h1")).toBe("Dashboard");
    await browser.waitForText("Connected");
    expect(await browser.text("body")).toContain(String(await countUsers()));
  });

  it("users page asks to sign in without a session", async () => {
    browser = new Browser();
    await browser.open(`${baseUrl}/admin/users`);

    await browser.waitForText("Sign in to view users.");
  });

  it("users page lists the seeded user for a signed-in visitor", async () => {
    browser = new Browser();
    const user = await seedUser("Katherine Johnson");
    const session = await sessionCookie(user.id);
    await browser.setCookie(session.name, session.value, baseUrl);
    await browser.open(`${baseUrl}/admin/users`);

    await browser.waitForText(user.email);
    expect(await browser.text("table")).toContain("Katherine Johnson");
  });
});
