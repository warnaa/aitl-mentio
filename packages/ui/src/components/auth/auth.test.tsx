// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { AccountNav, type AccountNavLinkProps } from "./AccountNav";
import { AuthPanel } from "./AuthPanel";

afterEach(cleanup);

const nav = { brand: { href: "/", label: "Mentio" }, navLabel: "Account", signIn: { href: "/logowanie", label: "Sign in" }, signUp: { href: "/rejestracja", label: "Create account" } };

it("offers sign-in and sign-up when signed out", () => {
  render(<AccountNav {...nav} signedIn={false} signOut={<button>Sign out</button>} />);
  const account = screen.getByRole("navigation", { name: "Account" });
  expect(within(account).getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/logowanie");
  expect(within(account).getByRole("link", { name: "Create account" }).className).toBe("mentio-site-cta");
  expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  expect(screen.getByRole("banner")).toBeTruthy();
});

it("shows only the app's sign-out control when signed in, through the app link", () => {
  const seen: string[] = [];
  const AppLink = ({ href, children, ...rest }: AccountNavLinkProps) => { seen.push(href); return <a href={href} {...rest}>{children}</a>; };
  render(<AccountNav {...nav} signedIn signOut={<button>Sign out</button>} linkComponent={AppLink} />);
  expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  expect(seen).toEqual(["/"]);
});

it("renders the auth page body with optional description and footer", () => {
  const { container } = render(<AuthPanel title="Sign in" description="Use the email you registered with." footer={<a href="/rejestracja">No account? Create one</a>}><form aria-label="Sign in form" /></AuthPanel>);
  expect(screen.getByRole("main", { name: "Sign in" })).toBeTruthy();
  expect(screen.getByText("Use the email you registered with.")).toBeTruthy();
  expect(container.querySelector(".mentio-auth-footer a")).toBeTruthy();
  cleanup();
  const bare = render(<AuthPanel title="Become a mentor"><button>Become a mentor</button></AuthPanel>);
  expect(bare.container.querySelector(".mentio-public-lead")).toBeNull();
  expect(bare.container.querySelector(".mentio-auth-footer")).toBeNull();
});

it("names each auth panel by its own title when two render on one page", () => {
  render(<><AuthPanel title="Sign in"><span /></AuthPanel><AuthPanel title="Create account"><span /></AuthPanel></>);
  expect(screen.getByRole("main", { name: "Create account" })).toBeTruthy();
  expect(screen.getByRole("main", { name: "Sign in" })).toBeTruthy();
});
