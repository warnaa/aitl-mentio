import { describe, expect, it } from "vitest";
import { MAX_PAGE_SIZE } from "../pagination.schema";
import { userListSchema } from "./user-list.schema";

describe("userListSchema", () => {
  it("accepts pagination parameters", () => {
    expect(userListSchema.parse({ limit: "10", offset: "20" })).toEqual({ limit: 10, offset: 20 });
  });

  it("caps the page size", () => {
    expect(userListSchema.safeParse({ limit: MAX_PAGE_SIZE + 1 }).success).toBe(false);
  });
});
