// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { PanelShell, type PanelLinkProps } from "./PanelShell";

afterEach(cleanup);

const items = [{ href: "/mentor/strona", label: "My page" }, { href: "/mentor/terminy", label: "My slots" }];

it("renders a named task navigation with the current page marked and a skip link", () => {
  render(<PanelShell title="Mentio — mentor" homeHref="/mentor/strona" items={items} currentHref="/mentor/terminy" navLabel="Mentor" skipLabel="Skip to content" actions={<button>Sign out</button>}><h1>My slots</h1></PanelShell>);
  const nav = screen.getByRole("navigation", { name: "Mentor" });
  expect(nav).toBeTruthy();
  expect(screen.getByRole("link", { name: "My slots" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link", { name: "My page" }).hasAttribute("aria-current")).toBe(false);
  const skip = screen.getByRole("link", { name: "Skip to content" });
  expect(document.getElementById(skip.getAttribute("href")!.slice(1))!.tagName).toBe("MAIN");
  expect(screen.getByRole("button", { name: "Sign out" }).closest("header")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Mentio — mentor" }).getAttribute("href")).toBe("/mentor/strona");
});

it("uses the app's link component and omits an empty header", () => {
  const seen: string[] = [];
  function AppLink({ href, children, ...rest }: PanelLinkProps) {
    seen.push(href);
    return <a href={href} data-app-link {...rest}>{children}</a>;
  }
  const { container } = render(<PanelShell title="Mentio" homeHref="/" items={items} navLabel="Mentor" skipLabel="Skip to content" linkComponent={AppLink}>Content</PanelShell>);
  expect(seen).toEqual(["/", "/mentor/strona", "/mentor/terminy"]);
  expect(container.querySelectorAll("[data-app-link]")).toHaveLength(3);
  expect(container.querySelector("header")).toBeNull();
});
