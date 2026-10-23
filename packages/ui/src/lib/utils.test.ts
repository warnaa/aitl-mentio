import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins conditional classes and lets later Tailwind utilities win", () => {
    expect(cn("px-2 py-1", false && "hidden", { "text-sm": true }, "px-4")).toBe("py-1 text-sm px-4");
  });
});
