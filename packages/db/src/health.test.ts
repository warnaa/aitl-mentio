import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkDatabase } from "./health";
import { getOrm } from "./orm";

vi.mock("./orm", () => ({ getOrm: vi.fn() }));

const execute = vi.fn();

beforeEach(() => {
  vi.mocked(getOrm).mockResolvedValue({
    em: { getConnection: () => ({ execute }) },
  } as unknown as Awaited<ReturnType<typeof getOrm>>);
});

describe("checkDatabase", () => {
  it("reports up after a real round-trip", async () => {
    execute.mockResolvedValue([{ "?column?": 1 }]);
    await expect(checkDatabase()).resolves.toEqual({ isUp: true });
    expect(execute).toHaveBeenCalledWith("select 1");
  });

  it("reports down with the error message when the query fails", async () => {
    execute.mockRejectedValue(new Error("connection refused"));
    await expect(checkDatabase()).resolves.toEqual({ isUp: false, reason: "connection refused" });
  });

  it("reports down when the ORM cannot be initialized, even for non-Error throws", async () => {
    vi.mocked(getOrm).mockRejectedValue("bad config");
    await expect(checkDatabase()).resolves.toEqual({ isUp: false, reason: "bad config" });
  });
});
