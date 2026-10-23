import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, paginationQuerySchema } from "./pagination.schema";

describe("paginationQuerySchema", () => {
  it("defaults limit and offset", () => {
    expect(paginationQuerySchema.parse({})).toEqual({ limit: DEFAULT_PAGE_SIZE, offset: 0 });
  });

  it("coerces query-string numbers", () => {
    expect(paginationQuerySchema.parse({ limit: "5", offset: "10" })).toEqual({ limit: 5, offset: 10 });
  });

  it.each([
    ["limit above the maximum", { limit: MAX_PAGE_SIZE + 1 }],
    ["limit below 1", { limit: 0 }],
    ["a negative offset", { offset: -1 }],
    ["a fractional limit", { limit: 1.5 }],
    ["a non-numeric limit", { limit: "abc" }],
  ])("rejects %s", (_label, input) => {
    expect(paginationQuerySchema.safeParse(input).success).toBe(false);
  });
});
