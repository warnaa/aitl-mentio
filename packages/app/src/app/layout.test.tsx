import { describe, expect, it, vi } from "vitest";
import RootLayout, { metadata } from "./layout";

vi.mock("./globals.css", () => ({}));

describe("RootLayout", () => {
  it("wraps pages in the html/body shell", () => {
    const element = RootLayout({ children: <p>child</p> });

    expect(element.type).toBe("html");
    expect(element.props.lang).toBe("en");
    expect(element.props.children.type).toBe("body");
    expect(element.props.children.props.children).toEqual(<p>child</p>);
    expect(metadata.title).toEqual({ default: "Mentio", template: "%s · Mentio" });
  });
});
