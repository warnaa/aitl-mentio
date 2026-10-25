import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkNode, createIo, fillEmptyValue, installDependencies, main, migrateDatabase, prepareEnv } from "./setup.mjs";

vi.mock("node:child_process", () => ({ execFileSync: vi.fn(() => "") }));

const ROOT = "/repo";
const LOCK = `${ROOT}/package-lock.json`;
const INSTALLED = `${ROOT}/node_modules/.package-lock.json`;
const ENV = `${ROOT}/.env`;
const EXAMPLE = `${ROOT}/.env.example`;
const NO_PENDING = "No pending migrations\n";

/** In-memory io: `files` maps path → text, `mtimes` maps path → mtimeMs. */
function fakeIo({ files = {}, mtimes = {}, pending = NO_PENDING } = {}) {
  const fs = { ...files };
  return {
    fs,
    exists: vi.fn((file) => file in fs),
    mtime: vi.fn((file) => mtimes[file]),
    read: vi.fn((file) => fs[file]),
    write: vi.fn((file, content) => {
      fs[file] = content;
    }),
    copy: vi.fn((from, to) => {
      fs[to] = fs[from];
    }),
    secret: vi.fn(() => "generated-secret"),
    run: vi.fn(),
    capture: vi.fn(() => pending),
  };
}

const freshRepo = () => ({
  files: { [LOCK]: "{}", [EXAMPLE]: "# comment\nDATABASE_URL=postgresql://localhost/mentio\nJWT_SECRET=\nLOG_LEVEL=info\n" },
  pending: "Name\n20261023053743\n",
});

const log = () => ({ info: vi.fn(), error: vi.fn() });

describe("checkNode", () => {
  it.each(["22.17.0", "22.20.1", "23.0.0", "24.1.0"])("accepts Node %s", (version) => {
    expect(checkNode(version)).toEqual({ status: "ok", detail: `Node.js ${version}` });
  });

  it.each(["22.16.9", "20.19.0", "18.0.0"])("rejects Node %s", (version) => {
    expect(() => checkNode(version)).toThrow(`Node.js ${version} is too old (need >= 22.17)`);
  });

  it("defaults to the running Node", () => {
    expect(checkNode().detail).toBe(`Node.js ${process.versions.node}`);
  });
});

describe("fillEmptyValue", () => {
  it("replaces an empty value and keeps every other line", () => {
    const text = "# secret\nJWT_SECRET=\nLOG_LEVEL=info\n";
    expect(fillEmptyValue(text, "JWT_SECRET", "abc")).toEqual({ content: "# secret\nJWT_SECRET=abc\nLOG_LEVEL=info\n", changed: true });
  });

  it("treats a whitespace-only value as empty", () => {
    expect(fillEmptyValue("JWT_SECRET=  \n", "JWT_SECRET", "abc").content).toBe("JWT_SECRET=abc\n");
  });

  it("never overwrites an existing value", () => {
    const text = "JWT_SECRET=mine\n";
    expect(fillEmptyValue(text, "JWT_SECRET", "abc")).toEqual({ content: text, changed: false });
  });

  it("appends a missing key, adding the newline the file lacks", () => {
    expect(fillEmptyValue("LOG_LEVEL=info", "JWT_SECRET", "abc")).toEqual({ content: "LOG_LEVEL=info\nJWT_SECRET=abc\n", changed: true });
    expect(fillEmptyValue("LOG_LEVEL=info\n", "JWT_SECRET", "abc").content).toBe("LOG_LEVEL=info\nJWT_SECRET=abc\n");
  });

  it("writes just the key into an empty file", () => {
    expect(fillEmptyValue("", "JWT_SECRET", "abc").content).toBe("JWT_SECRET=abc\n");
  });

  it("does not mistake a key that merely ends with the name", () => {
    expect(fillEmptyValue("OLD_JWT_SECRET=x\n", "JWT_SECRET", "abc")).toEqual({ content: "OLD_JWT_SECRET=x\nJWT_SECRET=abc\n", changed: true });
  });
});

describe("installDependencies", () => {
  it("installs when node_modules is missing", () => {
    const io = fakeIo({ files: { [LOCK]: "{}" } });
    expect(installDependencies(ROOT, io)).toEqual({ status: "done", detail: "npm install" });
    expect(io.run).toHaveBeenCalledWith("npm", ["install"]);
  });

  it("installs when the lockfile is newer than the installed tree", () => {
    const io = fakeIo({ files: { [LOCK]: "{}", [INSTALLED]: "{}" }, mtimes: { [LOCK]: 200, [INSTALLED]: 100 } });
    expect(installDependencies(ROOT, io).status).toBe("done");
    expect(io.run).toHaveBeenCalledOnce();
  });

  it("skips when the installed tree is at least as new as the lockfile", () => {
    const io = fakeIo({ files: { [LOCK]: "{}", [INSTALLED]: "{}" }, mtimes: { [LOCK]: 100, [INSTALLED]: 100 } });
    expect(installDependencies(ROOT, io)).toEqual({ status: "skipped", detail: "dependencies already installed" });
    expect(io.run).not.toHaveBeenCalled();
  });
});

describe("prepareEnv", () => {
  it("creates .env from .env.example and generates the secret", () => {
    const io = fakeIo(freshRepo());
    expect(prepareEnv(ROOT, io)).toEqual({ status: "done", detail: "created .env from .env.example, generated JWT_SECRET" });
    expect(io.copy).toHaveBeenCalledWith(EXAMPLE, ENV);
    expect(io.fs[ENV]).toBe("# comment\nDATABASE_URL=postgresql://localhost/mentio\nJWT_SECRET=generated-secret\nLOG_LEVEL=info\n");
  });

  it("only generates the secret when .env exists with an empty one, keeping the user's edits", () => {
    const io = fakeIo({ files: { [ENV]: "DATABASE_URL=postgresql://me@db/custom\nJWT_SECRET=\n" } });
    expect(prepareEnv(ROOT, io)).toEqual({ status: "done", detail: "generated JWT_SECRET" });
    expect(io.copy).not.toHaveBeenCalled();
    expect(io.fs[ENV]).toBe("DATABASE_URL=postgresql://me@db/custom\nJWT_SECRET=generated-secret\n");
  });

  it("skips and leaves the file untouched when .env is complete", () => {
    const io = fakeIo({ files: { [ENV]: "JWT_SECRET=mine\n" } });
    expect(prepareEnv(ROOT, io)).toEqual({ status: "skipped", detail: ".env exists and JWT_SECRET is set" });
    expect(io.write).not.toHaveBeenCalled();
    expect(io.copy).not.toHaveBeenCalled();
  });

  it("does not generate a secret it won't use", () => {
    const io = fakeIo({ files: { [ENV]: "JWT_SECRET=mine\n" } });
    prepareEnv(ROOT, io);
    expect(io.fs[ENV]).toBe("JWT_SECRET=mine\n");
  });
});

describe("migrateDatabase", () => {
  it("skips when nothing is pending", () => {
    const io = fakeIo();
    expect(migrateDatabase(ROOT, io)).toEqual({ status: "skipped", detail: "no pending migrations" });
    expect(io.capture).toHaveBeenCalledWith("npm", ["run", "mikro-orm", "-w", "@mentio/db", "--", "migration:pending"]);
    expect(io.run).not.toHaveBeenCalled();
  });

  it("applies the migrations when some are pending", () => {
    const io = fakeIo({ pending: "Name\n20261023053743\n" });
    expect(migrateDatabase(ROOT, io)).toEqual({ status: "done", detail: "applied pending migrations" });
    expect(io.run).toHaveBeenCalledWith("npm", ["run", "db:migrate"]);
  });

  it("lets an unreachable database fail the step", () => {
    const io = fakeIo();
    io.capture.mockImplementation(() => {
      throw new Error("connect ECONNREFUSED");
    });
    expect(() => migrateDatabase(ROOT, io)).toThrow("ECONNREFUSED");
    expect(io.run).not.toHaveBeenCalled();
  });
});

describe("main", () => {
  const upToDate = () => fakeIo({ files: { [LOCK]: "{}", [INSTALLED]: "{}", [ENV]: "JWT_SECRET=mine\n" }, mtimes: { [LOCK]: 1, [INSTALLED]: 2 } });

  it("runs every step on a fresh clone", () => {
    const io = fakeIo({ ...freshRepo() });
    const out = log();
    expect(main({ root: ROOT, io, log: out })).toBe(0);
    expect(out.info.mock.calls.map(([line]) => line)).toEqual([
      expect.stringMatching(/^✔ Node\.js — Node\.js \d/),
      "✔ Dependencies — npm install",
      "✔ Environment — created .env from .env.example, generated JWT_SECRET",
      "✔ Database — applied pending migrations",
      "Setup complete. Next: `npm run dev` → http://localhost:3000",
    ]);
    expect(io.run.mock.calls).toEqual([["npm", ["install"]], ["npm", ["run", "db:migrate"]]]);
    expect(out.error).not.toHaveBeenCalled();
  });

  it("changes nothing on a second run and reports every step as skipped", () => {
    const io = upToDate();
    const out = log();
    expect(main({ root: ROOT, io, log: out })).toBe(0);
    expect(out.info.mock.calls.map(([line]) => line).slice(1, 4)).toEqual([
      "↷ Dependencies — skipped (dependencies already installed)",
      "↷ Environment — skipped (.env exists and JWT_SECRET is set)",
      "↷ Database — skipped (no pending migrations)",
    ]);
    expect(io.run).not.toHaveBeenCalled();
    expect(io.write).not.toHaveBeenCalled();
    expect(io.copy).not.toHaveBeenCalled();
  });

  it("is idempotent end to end: the second run skips what the first one did", () => {
    const io = fakeIo({ ...freshRepo() });
    main({ root: ROOT, io, log: log() });
    io.fs[INSTALLED] = "{}"; // npm install wrote the installed tree
    io.mtime.mockImplementation((file) => (file === INSTALLED ? 2 : 1));
    io.capture.mockReturnValue(NO_PENDING); // migrations are now applied
    io.run.mockClear();
    io.write.mockClear();
    const out = log();
    expect(main({ root: ROOT, io, log: out })).toBe(0);
    expect(io.run).not.toHaveBeenCalled();
    expect(io.write).not.toHaveBeenCalled();
    expect(out.info.mock.calls.filter(([line]) => line.startsWith("↷"))).toHaveLength(3);
  });

  it("stops at the first failing step, naming the cause and the fix", () => {
    const io = upToDate();
    io.capture.mockImplementation(() => {
      throw new Error("Command failed: npm run mikro-orm\nconnect ECONNREFUSED 127.0.0.1:5432");
    });
    const out = log();
    expect(main({ root: ROOT, io, log: out })).toBe(1);
    expect(out.error.mock.calls.map(([line]) => line)).toEqual([
      "✖ Database — Command failed: npm run mikro-orm",
      expect.stringContaining("createdb mentio"),
    ]);
    expect(out.info.mock.calls.map(([line]) => line)).not.toContainEqual(expect.stringMatching(/^Setup complete/));
  });

  it("does not run later steps after a failed install", () => {
    const io = fakeIo({ ...freshRepo() });
    io.run.mockImplementation(() => {
      throw new Error("Command failed: npm install");
    });
    expect(main({ root: ROOT, io, log: log() })).toBe(1);
    expect(io.copy).not.toHaveBeenCalled();
    expect(io.capture).not.toHaveBeenCalled();
  });

  it("never prints the generated secret", () => {
    const io = fakeIo({ ...freshRepo() });
    const out = log();
    main({ root: ROOT, io, log: out });
    expect(JSON.stringify([out.info.mock.calls, out.error.mock.calls])).not.toContain("generated-secret");
  });
});

describe("createIo", () => {
  const dirs = [];
  const tempRoot = () => {
    const dir = mkdtempSync(join(tmpdir(), "mentio-setup-"));
    dirs.push(dir);
    return dir;
  };
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
    vi.mocked(execFileSync).mockClear();
  });

  it("reads, writes, copies and stats real files", () => {
    const root = tempRoot();
    const io = createIo(root);
    writeFileSync(join(root, "a"), "one");
    expect(io.exists(join(root, "a"))).toBe(true);
    expect(io.exists(join(root, "missing"))).toBe(false);
    expect(io.read(join(root, "a"))).toBe("one");
    io.write(join(root, "a"), "two");
    io.copy(join(root, "a"), join(root, "b"));
    expect(readFileSync(join(root, "b"), "utf8")).toBe("two");
    expect(io.mtime(join(root, "a"))).toBeGreaterThan(0);
    expect(existsSync(join(root, "b"))).toBe(true);
  });

  it("generates a 32-byte base64 secret each time", () => {
    const io = createIo(tempRoot());
    const [first, second] = [io.secret(), io.secret()];
    expect(Buffer.from(first, "base64")).toHaveLength(32);
    expect(first).not.toBe(second);
  });

  it("runs commands in the repo root, streaming output", () => {
    const io = createIo("/some/root");
    io.run("npm", ["install"]);
    expect(execFileSync).toHaveBeenCalledWith("npm", ["install"], { cwd: "/some/root", stdio: "inherit" });
  });

  it("captures command output as text", () => {
    vi.mocked(execFileSync).mockReturnValueOnce("out");
    const io = createIo("/some/root");
    expect(io.capture("npm", ["run", "x"])).toBe("out");
    expect(execFileSync).toHaveBeenCalledWith("npm", ["run", "x"], { cwd: "/some/root", encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  });
});

describe("CLI entry", () => {
  it("sets up the repo root and sets the exit code when executed directly", async () => {
    vi.resetModules();
    // Fake filesystem: an already set-up repo, so nothing real is read, written or installed.
    vi.doMock("node:fs", () => ({
      existsSync: () => true,
      statSync: () => ({ mtimeMs: 1 }),
      readFileSync: () => "JWT_SECRET=mine\n",
      writeFileSync: vi.fn(),
      copyFileSync: vi.fn(),
    }));
    vi.mocked(execFileSync).mockReturnValue("No pending migrations\n");
    const stdout = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const argv = process.argv;
    process.argv = [argv[0], fileURLToPath(new URL("./setup.mjs", import.meta.url))];
    try {
      await import("./setup.mjs");
      expect(process.exitCode).toBe(0);
      expect(stdout).toHaveBeenCalledWith(expect.stringContaining("Setup complete"));
      expect(execFileSync).toHaveBeenCalledOnce(); // only the read-only migration:pending probe
    } finally {
      process.argv = argv;
      process.exitCode = undefined;
      vi.doUnmock("node:fs");
    }
  });

  it("reports a failure on stderr and exits non-zero", async () => {
    vi.resetModules();
    vi.doMock("node:fs", () => ({
      existsSync: () => true,
      statSync: () => ({ mtimeMs: 1 }),
      readFileSync: () => "JWT_SECRET=mine\n",
      writeFileSync: vi.fn(),
      copyFileSync: vi.fn(),
    }));
    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error("connect ECONNREFUSED");
    });
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const argv = process.argv;
    process.argv = [argv[0], fileURLToPath(new URL("./setup.mjs", import.meta.url))];
    try {
      await import("./setup.mjs");
      expect(process.exitCode).toBe(1);
      expect(stderr).toHaveBeenCalledWith(expect.stringContaining("✖ Database — connect ECONNREFUSED"));
    } finally {
      process.argv = argv;
      process.exitCode = undefined;
      vi.doUnmock("node:fs");
      vi.mocked(execFileSync).mockReset();
      vi.mocked(execFileSync).mockReturnValue("");
    }
  });
});
