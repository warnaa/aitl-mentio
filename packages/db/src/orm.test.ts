import { MikroORM } from "@mikro-orm/postgresql";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closeOrm, getOrm } from "./orm";

vi.mock("./config", () => ({ createOrmConfig: () => ({ clientUrl: "postgresql://test" }) }));
vi.mock("@mikro-orm/postgresql", () => ({ MikroORM: { init: vi.fn() } }));

const fakeOrm = () => ({ close: vi.fn() }) as unknown as MikroORM;

afterEach(async () => {
  vi.mocked(MikroORM.init).mockResolvedValue(fakeOrm());
  await closeOrm();
});

describe("getOrm", () => {
  it("initializes once per process and reuses the instance", async () => {
    const orm = fakeOrm();
    vi.mocked(MikroORM.init).mockResolvedValue(orm);

    await expect(getOrm()).resolves.toBe(orm);
    await expect(getOrm()).resolves.toBe(orm);
    expect(MikroORM.init).toHaveBeenCalledTimes(1);
    expect(MikroORM.init).toHaveBeenCalledWith({ clientUrl: "postgresql://test" });
  });

  it("forgets a failed init so the next call retries", async () => {
    const orm = fakeOrm();
    vi.mocked(MikroORM.init).mockRejectedValueOnce(new Error("db down")).mockResolvedValueOnce(orm);

    await expect(getOrm()).rejects.toThrow("db down");
    await expect(getOrm()).resolves.toBe(orm);
    expect(MikroORM.init).toHaveBeenCalledTimes(2);
  });
});

describe("closeOrm", () => {
  it("closes the cached ORM and drops it", async () => {
    const orm = fakeOrm();
    vi.mocked(MikroORM.init).mockResolvedValue(orm);
    await getOrm();

    await closeOrm();
    expect(orm.close).toHaveBeenCalledTimes(1);

    await getOrm();
    expect(MikroORM.init).toHaveBeenCalledTimes(2);
  });

  it("is a no-op when no ORM was created", async () => {
    await expect(closeOrm()).resolves.toBeUndefined();
    expect(MikroORM.init).not.toHaveBeenCalled();
  });
});
