import { beforeEach, describe, expect, it, vi } from "vitest";

const fork = vi.fn();
const getOrm = vi.fn();
const logger = { info: vi.fn() };

vi.mock("@mentio/db", () => ({ getOrm, User: class UserEntity {} }));
vi.mock("../logger", () => ({ getLogger: () => logger }));

async function loadContainer() {
  vi.resetModules();
  return import("./container");
}

describe("container", () => {
  beforeEach(() => {
    getOrm.mockReset();
    fork.mockReset();
    getOrm.mockResolvedValue({ em: { fork } });
  });

  it("registers the ORM and logger on a cached root container", async () => {
    const { getContainer } = await loadContainer();
    const container = await getContainer();

    expect(await getContainer()).toBe(container);
    expect(getOrm).toHaveBeenCalledTimes(1);
    expect(container.cradle.logger).toBe(logger);
    expect(container.cradle.orm).toEqual({ em: { fork } });
  });

  it("does not cache a failed build, so the next call retries", async () => {
    const { getContainer } = await loadContainer();
    getOrm.mockRejectedValueOnce(new Error("db down"));

    await expect(getContainer()).rejects.toThrow("db down");
    await expect(getContainer()).resolves.toBeDefined();
    expect(getOrm).toHaveBeenCalledTimes(2);
  });

  it("gives each request scope its own forked EntityManager", async () => {
    const { createRequestScope } = await loadContainer();
    fork.mockReturnValueOnce({ id: "em-1" }).mockReturnValueOnce({ id: "em-2" });

    const first = await createRequestScope();
    const second = await createRequestScope();

    expect(first.cradle.em).toEqual({ id: "em-1" });
    expect(second.cradle.em).toEqual({ id: "em-2" });
  });

  it("resolves scoped services from the request scope", async () => {
    const { withScope } = await loadContainer();
    fork.mockReturnValue({ count: vi.fn().mockResolvedValue(7) });

    await expect(withScope((cradle) => cradle.userService.count())).resolves.toBe(7);
  });

  it("disposes the scope after the callback, even when it throws", async () => {
    const { withScope, getContainer } = await loadContainer();
    fork.mockReturnValue({});
    const container = await getContainer();
    const dispose = vi.fn().mockResolvedValue(undefined);
    const createScope = container.createScope.bind(container);
    vi.spyOn(container, "createScope").mockImplementation(() => Object.assign(createScope(), { dispose }));

    await expect(withScope(async () => "ok")).resolves.toBe("ok");
    await expect(withScope(async () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    expect(dispose).toHaveBeenCalledTimes(2);
  });
});
