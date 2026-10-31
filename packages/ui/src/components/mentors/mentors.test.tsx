// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MentorDirectory, type PublicLinkProps } from "./MentorDirectory";
import { MentorPageStatus } from "./MentorPageStatus";
import { MentorProfile } from "./MentorProfile";

afterEach(cleanup);

const items = [
  { href: "/mentorzy/alex", displayName: "Alex", excerpt: "Kubernetes and ingress.", priceLabel: "25 min — 120 zł", availabilityLabel: "Next slot: Thursday, 6 November, 18:00" },
  { href: "/mentorzy/marta", displayName: "Marta", excerpt: "PostgreSQL locking.", priceLabel: "No rate yet", availabilityLabel: "No slots to book" },
];

it("lists mentors as rows with a heading link, excerpt and formatted facts, and pages", () => {
  render(<MentorDirectory heading="Mentors" intro="Find a mentor." items={items} emptyText="There are no mentors on the list yet" pagination={{ navLabel: "Pages", label: "Page 2 of 3", previousHref: "/mentorzy?strona=1", nextHref: "/mentorzy?strona=3", previousLabel: "Previous page", nextLabel: "Next page" }} />);
  expect(screen.getByRole("heading", { level: 1, name: "Mentors" })).toBeTruthy();
  const rows = screen.getAllByRole("listitem");
  expect(rows).toHaveLength(2);
  expect(within(rows[0]).getByRole("link", { name: "Alex" }).getAttribute("href")).toBe("/mentorzy/alex");
  expect(within(rows[1]).getByText("No slots to book")).toBeTruthy();
  const nav = screen.getByRole("navigation", { name: "Pages" });
  expect(within(nav).getByRole("link", { name: "Previous page" }).getAttribute("rel")).toBe("prev");
  expect(within(nav).getByRole("link", { name: "Next page" }).getAttribute("href")).toBe("/mentorzy?strona=3");
  expect(screen.queryByText(/rating|stars/i)).toBeNull();
});

it("shows the empty text, omits intro and missing page links, and uses the app link", () => {
  const seen: string[] = [];
  const AppLink = ({ href, children, ...rest }: PublicLinkProps) => { seen.push(href); return <a href={href} data-app {...rest}>{children}</a>; };
  const { container } = render(<MentorDirectory heading="Mentors" items={[]} emptyText="There are no mentors on the list yet" pagination={{ navLabel: "Pages", label: "Page 1 of 1", previousLabel: "Previous page", nextLabel: "Next page" }} linkComponent={AppLink} />);
  expect(screen.getByText("There are no mentors on the list yet")).toBeTruthy();
  expect(screen.queryByRole("list")).toBeNull();
  expect(container.querySelector(".mentio-public-lead")).toBeNull();
  expect(screen.queryByRole("link")).toBeNull();
  cleanup();
  render(<MentorDirectory heading="Mentors" items={items} emptyText="" linkComponent={AppLink} />);
  expect(seen).toEqual(["/mentorzy/alex", "/mentorzy/marta"]);
  expect(screen.queryByRole("navigation")).toBeNull();
});

const profile = {
  displayName: "Alex",
  description: "I help with Kubernetes.\nAsk about ingress.",
  work: { heading: "Public work", links: ["https://example.test/alex/ingress-upgrade-notes"], newTabLabel: "opens in a new tab" },
  prices: { heading: "Prices", items: ["25 min — 120 zł", "50 min — 240 zł"], unavailableText: "The mentor has not set a rate yet — booking is unavailable" },
  slots: { heading: "Available slots", days: [{ label: "Thursday, 6 November", slots: [{ id: "s1", label: "18:00" }, { id: "s2", label: "19:30" }] }], emptyText: "No available slots" },
  textOnlyNote: "Sessions take place in text only.",
};

it("renders the public page in spec order with safe new-tab work links", () => {
  render(<MentorProfile {...profile} />);
  const headings = screen.getAllByRole("heading").map((heading) => heading.textContent);
  expect(headings).toEqual(["Alex", "Public work", "Prices", "Available slots", "Thursday, 6 November"]);
  const link = screen.getByRole("link", { name: /ingress-upgrade-notes\s*\(opens in a new tab\)/ });
  expect(link.getAttribute("target")).toBe("_blank");
  expect(link.getAttribute("rel")).toBe("noopener noreferrer nofollow ugc");
  expect(screen.getByText("50 min — 240 zł")).toBeTruthy();
  expect(screen.getByText("18:00").tagName).toBe("SPAN");
  expect(screen.getByText("Sessions take place in text only.")).toBeTruthy();
  expect(screen.queryByText(/rating|stars/i)).toBeNull();
});

it("states when there is no rate or no slot, and links bookable slots in E02", () => {
  const seen: string[] = [];
  const AppLink = ({ href, children, ...rest }: PublicLinkProps) => { seen.push(href); return <a href={href} {...rest}>{children}</a>; };
  render(<MentorProfile {...profile} prices={{ ...profile.prices, items: null }} slots={{ ...profile.slots, days: [] }} />);
  expect(screen.getByText("The mentor has not set a rate yet — booking is unavailable")).toBeTruthy();
  expect(screen.getByText("No available slots")).toBeTruthy();
  cleanup();
  render(<MentorProfile {...profile} linkComponent={AppLink} slots={{ ...profile.slots, bookLabel: "Book", days: [{ label: "Thursday, 6 November", slots: [{ id: "s1", label: "18:00", href: "/rezerwacje/nowa/s1" }] }] }} />);
  expect(screen.getByRole("link", { name: /^18:00\s*—\s*Book,\s*Thursday, 6 November$/ }).getAttribute("href")).toBe("/rezerwacje/nowa/s1");
  expect(seen).toEqual(["/rezerwacje/nowa/s1"]);
  cleanup();
  render(<MentorProfile {...profile} slots={{ ...profile.slots, days: [{ label: "Friday", slots: [{ id: "s3", label: "09:30", href: "/rezerwacje/nowa/s3" }] }] }} />);
  expect(screen.getByRole("link", { name: /^09:30,\s*Friday$/ })).toBeTruthy();
});

const status = { heading: "Your page", statusLabel: "Published", statusTone: "success" as const, shareLabel: "Share link", shareUrl: "https://mentio.example/mentorzy/alex", copyLabel: "Copy link", copiedLabel: "Copied", copyFailedLabel: "Select the link and copy it manually", action: <button>Unpublish page</button> };

it("shows the status, the action, a selectable share link and a view link when published", async () => {
  const writeText = vi.fn(async () => undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  render(<MentorPageStatus {...status} view={{ href: "/mentorzy/alex", label: "View page" }} />);
  expect(screen.getByRole("heading", { name: "Your page" })).toBeTruthy();
  expect(screen.getByText("Published").getAttribute("data-tone")).toBe("success");
  expect(screen.getByRole("button", { name: "Unpublish page" })).toBeTruthy();
  const field = screen.getByLabelText("Share link") as HTMLInputElement;
  expect(field.readOnly).toBe(true);
  fireEvent.focus(field);
  expect(field.selectionEnd).toBe(status.shareUrl.length);
  fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Copied"));
  expect(writeText).toHaveBeenCalledWith(status.shareUrl);
  expect(screen.getByRole("link", { name: "View page" }).getAttribute("href")).toBe("/mentorzy/alex");
});

it("explains a failed copy and omits the view link for a draft", async () => {
  vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn(async () => { throw new Error("denied"); }) } });
  render(<MentorPageStatus {...status} statusLabel="Draft" statusTone="neutral" />);
  fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Select the link and copy it manually"));
  expect(screen.queryByRole("link")).toBeNull();
});
