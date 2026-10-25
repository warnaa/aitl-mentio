import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkNode,
  createIo,
  describeDatabaseTarget,
  execNpm,
  fillEmptyValue,
  installDependencies,
  main,
  migrateDatabase,
  npmCommand,
  prepareEnv,
  readEnvValue,
} from "./setup.mjs";

vi.mock("node:child_process", () => ({ execFileSync: vi.fn(() => "") }));

const ROOT = "/repo";
const LOCK = `${ROOT}/package-lock.json`;
const INSTALLED = `${ROOT}/node_modules/.package-lock.json`;
const ENV = `${ROOT}/.env`;
const EXAMPLE = `${ROOT}/.env.example`;
const NO_PENDING = "No pending migrations\n";
const PENDING = "Name\nMigration20261023053743\n";
const LOCAL_TARGET = "localhost:5432/mentio (DATABASE_URL from .env)";

/** In-memory io: `files` maps path → text, `mtimes` maps path → mtimeMs. */
function fakeIo({ files = {}, mtimes = {}, pending = NO_PENDING, env = {} } = {}) {
  const fs = { ...files };
  return {
    fs,
    env,
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
    npm: vi.fn(),
    npmCapture: vi.fn(() => pending),
  };
}

const freshRepo = () => ({
  files: { [LOCK]: "{}", [EXAMPLE]: "# comment\nDATABASE_URL=postgresql://localhost:5432/mentio\nJWT_SECRET=\nLOG_LEVEL=info\n" },
  pending: PENDING,
});

const setUpRepo = (overrides = {}) =>
  fakeIo({
    files: { [LOCK]: "{}", [INSTALLED]: "{}", [ENV]: "DATABASE_URL=postgresql://localhost:5432/mentio\nJWT_SECRET=mine\n" },
    mtimes: { [LOCK]: 1, [INSTALLED]: 2 },
    ...overrides,
  });

const log = () => ({ info: vi.fn(), error: vi.fn() });
const lines = (fn) => fn.mock.calls.map(([line]) => line);

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

describe("readEnvValue", () => {
  it("reads a value, ignoring commented-out and similarly named keys", () => {
    expect(readEnvValue("# JWT_SECRET=old\nOLD_JWT_SECRET=x\nJWT_SECRET=abc\n", "JWT_SECRET")).toBe("abc");
  });

  it.each([
    ['JWT_SECRET="abc"', "abc"],
    ["JWT_SECRET='abc'", "abc"],
    ['JWT_SECRET=""', ""],
    ["JWT_SECRET=  ", ""],
    ['JWT_SECRET="abc', '"abc'],
  ])("unquotes like Node's parser: %s", (line, value) => {
    expect(readEnvValue(`${line}\n`, "JWT_SECRET")).toBe(value);
  });

  it("returns undefined for a missing key", () => {
    expect(readEnvValue("LOG_LEVEL=info\n", "JWT_SECRET")).toBeUndefined();
  });
});

describe("fillEmptyValue", () => {
  const make = (value = "abc") => vi.fn(() => value);

  it("replaces an empty value and keeps every other line", () => {
    const text = "# secret\nJWT_SECRET=\nLOG_LEVEL=info\n";
    expect(fillEmptyValue(text, "JWT_SECRET", make())).toEqual({ content: "# secret\nJWT_SECRET=abc\nLOG_LEVEL=info\n", changed: true });
  });

  it.each(["JWT_SECRET=  \n", 'JWT_SECRET=""\n', "JWT_SECRET=''\n"])("treats %j as empty", (text) => {
    expect(fillEmptyValue(text, "JWT_SECRET", make()).content).toBe("JWT_SECRET=abc\n");
  });

  it("never overwrites an existing value, and does not generate one it won't use", () => {
    const text = "JWT_SECRET=mine\n";
    const makeValue = make();
    expect(fillEmptyValue(text, "JWT_SECRET", makeValue)).toEqual({ content: text, changed: false });
    expect(makeValue).not.toHaveBeenCalled();
  });

  it("appends a missing key, adding the newline the file lacks", () => {
    expect(fillEmptyValue("LOG_LEVEL=info", "JWT_SECRET", make())).toEqual({ content: "LOG_LEVEL=info\nJWT_SECRET=abc\n", changed: true });
    expect(fillEmptyValue("LOG_LEVEL=info\n", "JWT_SECRET", make()).content).toBe("LOG_LEVEL=info\nJWT_SECRET=abc\n");
  });

  it("writes just the key into an empty file", () => {
    expect(fillEmptyValue("", "JWT_SECRET", make()).content).toBe("JWT_SECRET=abc\n");
  });

  it("does not mistake a key that merely ends with the name", () => {
    expect(fillEmptyValue("OLD_JWT_SECRET=x\n", "JWT_SECRET", make())).toEqual({ content: "OLD_JWT_SECRET=x\nJWT_SECRET=abc\n", changed: true });
  });

  it("writes `$` sequences in the value literally", () => {
    expect(fillEmptyValue("JWT_SECRET=\n", "JWT_SECRET", make("a$&b$1")).content).toBe("JWT_SECRET=a$&b$1\n");
  });
});

describe("describeDatabaseTarget", () => {
  const file = "DATABASE_URL=postgresql://user:pw@localhost:5432/mentio\n";

  it("names the .env database without credentials", () => {
    expect(describeDatabaseTarget(file, {})).toBe(LOCAL_TARGET);
  });

  it("says when an exported DATABASE_URL overrides .env", () => {
    expect(describeDatabaseTarget(file, { DATABASE_URL: "postgresql://admin:pw@127.0.0.1:5432/other" })).toBe(
      "127.0.0.1:5432/other (DATABASE_URL exported in your shell, overriding .env)",
    );
  });

  it("does not claim an override when the exported value matches .env", () => {
    expect(describeDatabaseTarget(file, { DATABASE_URL: "postgresql://user:pw@localhost:5432/mentio" })).toBe(
      "localhost:5432/mentio (DATABASE_URL exported in your shell)",
    );
  });

  it("names an exported value when .env has none", () => {
    expect(describeDatabaseTarget("LOG_LEVEL=info\n", { DATABASE_URL: "postgres://db/x" })).toBe("db:5432/x (DATABASE_URL exported in your shell)");
  });

  it("treats an exported empty value as winning, like Node does", () => {
    expect(describeDatabaseTarget(file, { DATABASE_URL: "" })).toBe(
      "an invalid DATABASE_URL (DATABASE_URL exported in your shell, overriding .env)",
    );
  });

  it("reports an unparseable or missing value without echoing it", () => {
    expect(describeDatabaseTarget("DATABASE_URL=not a url\n", {})).toBe("an invalid DATABASE_URL (DATABASE_URL from .env)");
    expect(describeDatabaseTarget("", {})).toBe("an invalid DATABASE_URL (DATABASE_URL from .env)");
  });
});

describe("npmCommand", () => {
  it("runs npm's JS entry through Node under `npm run` (works on Windows too)", () => {
    expect(npmCommand(["install"], { npm_execpath: "/npm/bin/npm-cli.js" }, "/bin/node")).toEqual(["/bin/node", ["/npm/bin/npm-cli.js", "install"]]);
    expect(npmCommand(["install"], { npm_execpath: "C:\\npm\\npm-cli.cjs" }, "node.exe")[1][0]).toBe("C:\\npm\\npm-cli.cjs");
  });

  it("falls back to `npm` outside `npm run` or when npm_execpath is not a JS file", () => {
    expect(npmCommand(["install"], {}, "/bin/node")).toEqual(["npm", ["install"]]);
    expect(npmCommand(["install"], { npm_execpath: "/usr/bin/yarn" }, "/bin/node")).toEqual(["npm", ["install"]]);
  });

  it("defaults to the current process", () => {
    const [file, args] = npmCommand(["x"]);
    expect(args.at(-1)).toBe("x");
    expect([process.execPath, "npm"]).toContain(file);
  });
});

describe("execNpm", () => {
  it("passes the resolved command and options through and returns the output", () => {
    const exec = vi.fn(() => "out");
    expect(execNpm(["run", "x"], { cwd: "/r" }, { npm_execpath: "/npm/npm-cli.js" }, exec)).toBe("out");
    expect(exec).toHaveBeenCalledWith(process.execPath, ["/npm/npm-cli.js", "run", "x"], { cwd: "/r" });
  });

  it("reports a failed command as the npm command and its exit code, keeping the cause", () => {
    const failure = Object.assign(new Error("Command failed: /usr/bin/node /npm/npm-cli.js install\nnoise"), { status: 1 });
    let error;
    try {
      execNpm(["install"], {}, {}, () => {
        throw failure;
      });
    } catch (caught) {
      error = caught;
    }
    expect(error.message).toBe("`npm install` failed (exit 1)");
    expect(error.cause).toBe(failure);
  });

  it("reports why npm could not start when there is no exit code", () => {
    const spawnFailure = (props) => () => {
      throw Object.assign(new Error("spawn"), props);
    };
    expect(() => execNpm(["install"], {}, {}, spawnFailure({ code: "ENOENT" }))).toThrow("`npm install` failed (ENOENT)");
    expect(() => execNpm(["install"], {}, {}, spawnFailure({}))).toThrow("`npm install` failed (did not run)");
  });

  it("defaults to the real environment and execFileSync", () => {
    vi.mocked(execFileSync).mockReturnValueOnce("real");
    expect(execNpm(["-v"], {})).toBe("real");
  });
});

describe("installDependencies", () => {
  it("installs when node_modules is missing", () => {
    const io = fakeIo({ files: { [LOCK]: "{}" } });
    expect(installDependencies(ROOT, io)).toEqual({ status: "done", detail: "npm install" });
    expect(io.npm).toHaveBeenCalledWith(["install"]);
  });

  it("installs when the lockfile is newer than the installed tree", () => {
    const io = fakeIo({ files: { [LOCK]: "{}", [INSTALLED]: "{}" }, mtimes: { [LOCK]: 200, [INSTALLED]: 100 } });
    expect(installDependencies(ROOT, io).status).toBe("done");
    expect(io.npm).toHaveBeenCalledOnce();
  });

  it("skips when the installed tree is at least as new as the lockfile", () => {
    const io = fakeIo({ files: { [LOCK]: "{}", [INSTALLED]: "{}" }, mtimes: { [LOCK]: 100, [INSTALLED]: 100 } });
    expect(installDependencies(ROOT, io)).toEqual({ status: "skipped", detail: "dependencies already installed" });
    expect(io.npm).not.toHaveBeenCalled();
  });
});

describe("prepareEnv", () => {
  it("creates .env from .env.example and generates the secret", () => {
    const io = fakeIo(freshRepo());
    expect(prepareEnv(ROOT, io)).toEqual({ status: "done", detail: "created .env from .env.example, generated JWT_SECRET" });
    expect(io.copy).toHaveBeenCalledWith(EXAMPLE, ENV);
    expect(io.fs[ENV]).toBe("# comment\nDATABASE_URL=postgresql://localhost:5432/mentio\nJWT_SECRET=generated-secret\nLOG_LEVEL=info\n");
  });

  it("only generates the secret when .env exists with an empty one, keeping the user's edits", () => {
    const io = fakeIo({ files: { [ENV]: "DATABASE_URL=postgresql://me@db/custom\nJWT_SECRET=\n" } });
    expect(prepareEnv(ROOT, io)).toEqual({ status: "done", detail: "generated JWT_SECRET" });
    expect(io.copy).not.toHaveBeenCalled();
    expect(io.fs[ENV]).toBe("DATABASE_URL=postgresql://me@db/custom\nJWT_SECRET=generated-secret\n");
  });

  it("fills a quoted empty secret instead of reporting it as set", () => {
    const io = fakeIo({ files: { [ENV]: 'JWT_SECRET=""\n' } });
    expect(prepareEnv(ROOT, io).detail).toBe("generated JWT_SECRET");
    expect(io.fs[ENV]).toBe("JWT_SECRET=generated-secret\n");
  });

  it("skips, leaves the file untouched and generates nothing when .env is complete", () => {
    const io = fakeIo({ files: { [ENV]: "JWT_SECRET=mine\n" } });
    expect(prepareEnv(ROOT, io)).toEqual({ status: "skipped", detail: ".env exists and JWT_SECRET is set" });
    expect(io.write).not.toHaveBeenCalled();
    expect(io.copy).not.toHaveBeenCalled();
    expect(io.secret).not.toHaveBeenCalled();
  });
});

describe("migrateDatabase", () => {
  it("skips when nothing is pending, naming the database it checked", () => {
    const io = setUpRepo();
    expect(migrateDatabase(ROOT, io)).toEqual({ status: "skipped", detail: `no pending migrations in ${LOCAL_TARGET}` });
    expect(io.npmCapture).toHaveBeenCalledWith(["run", "mikro-orm", "-w", "@mentio/db", "--", "migration:pending"]);
    expect(io.npm).not.toHaveBeenCalled();
  });

  it("applies the migrations when some are pending, naming the target", () => {
    const io = setUpRepo({ pending: PENDING });
    expect(migrateDatabase(ROOT, io)).toEqual({ status: "done", detail: `applied pending migrations to ${LOCAL_TARGET}` });
    expect(io.npm).toHaveBeenCalledWith(["run", "db:migrate"]);
  });

  it("names the exported database it would migrate instead of .env's", () => {
    const io = setUpRepo({ pending: PENDING, env: { DATABASE_URL: "postgresql://x:pw@127.0.0.1:5432/other" } });
    expect(migrateDatabase(ROOT, io).detail).toBe(
      "applied pending migrations to 127.0.0.1:5432/other (DATABASE_URL exported in your shell, overriding .env)",
    );
  });

  // The real unreachable-server path: `migration:pending` does not connect, lists everything as
  // pending and exits 0; the connection error comes from `db:migrate`.
  it("fails with the target when the server is unreachable and db:migrate fails", () => {
    const io = setUpRepo({ pending: PENDING });
    io.npm.mockImplementation(() => {
      throw new Error("Command failed: npm run db:migrate\nconnect ECONNREFUSED 127.0.0.1:5432");
    });
    expect(() => migrateDatabase(ROOT, io)).toThrow(`Command failed: npm run db:migrate — target: ${LOCAL_TARGET}`);
  });

  it("fails with the target when the pending check itself fails (e.g. an invalid DATABASE_URL)", () => {
    const io = setUpRepo();
    io.npmCapture.mockImplementation(() => {
      throw new Error("Command failed: npm run mikro-orm -w @mentio/db -- migration:pending");
    });
    let error;
    try {
      migrateDatabase(ROOT, io);
    } catch (caught) {
      error = caught;
    }
    expect(error.message).toBe(`Command failed: npm run mikro-orm -w @mentio/db -- migration:pending — target: ${LOCAL_TARGET}`);
    expect(error.cause).toBeInstanceOf(Error);
    expect(io.npm).not.toHaveBeenCalled();
  });
});

describe("main", () => {
  it("runs every step on a fresh clone", () => {
    const io = fakeIo(freshRepo());
    const out = log();
    expect(main({ root: ROOT, io, log: out })).toBe(0);
    expect(lines(out.info)).toEqual([
      expect.stringMatching(/^✔ Node\.js — Node\.js \d/),
      "✔ Dependencies — npm install",
      "✔ Environment — created .env from .env.example, generated JWT_SECRET",
      `✔ Database — applied pending migrations to ${LOCAL_TARGET}`,
      "Setup complete. Next: `npm run dev` → http://localhost:3000",
    ]);
    expect(io.npm.mock.calls).toEqual([[["install"]], [["run", "db:migrate"]]]);
    expect(out.error).not.toHaveBeenCalled();
  });

  it("changes nothing on a second run and reports every step as skipped", () => {
    const io = setUpRepo();
    const out = log();
    expect(main({ root: ROOT, io, log: out })).toBe(0);
    expect(lines(out.info).slice(1, 4)).toEqual([
      "↷ Dependencies — skipped (dependencies already installed)",
      "↷ Environment — skipped (.env exists and JWT_SECRET is set)",
      `↷ Database — skipped (no pending migrations in ${LOCAL_TARGET})`,
    ]);
    expect(io.npm).not.toHaveBeenCalled();
    expect(io.write).not.toHaveBeenCalled();
    expect(io.copy).not.toHaveBeenCalled();
  });

  it("is idempotent end to end: the second run skips what the first one did", () => {
    const io = fakeIo(freshRepo());
    main({ root: ROOT, io, log: log() });
    io.fs[INSTALLED] = "{}"; // npm install wrote the installed tree
    io.mtime.mockImplementation((file) => (file === INSTALLED ? 2 : 1));
    io.npmCapture.mockReturnValue(NO_PENDING); // migrations are now applied
    io.npm.mockClear();
    io.write.mockClear();
    const out = log();
    expect(main({ root: ROOT, io, log: out })).toBe(0);
    expect(io.npm).not.toHaveBeenCalled();
    expect(io.write).not.toHaveBeenCalled();
    expect(lines(out.info).filter((line) => line.startsWith("↷"))).toHaveLength(3);
  });

  it("stops at a failing database step, naming the target and where to fix it", () => {
    const io = setUpRepo({ env: { DATABASE_URL: "postgresql://x:pw@127.0.0.1:5432/other" } });
    io.npmCapture.mockImplementation(() => {
      throw new Error("Command failed: npm run mikro-orm\nraw stderr line");
    });
    const out = log();
    expect(main({ root: ROOT, io, log: out })).toBe(1);
    expect(lines(out.error)).toEqual([
      "✖ Database — Command failed: npm run mikro-orm — target: 127.0.0.1:5432/other (DATABASE_URL exported in your shell, overriding .env)",
      expect.stringContaining("`unset DATABASE_URL` to use .env"),
    ]);
    expect(lines(out.info)).not.toContainEqual(expect.stringMatching(/^Setup complete/));
  });

  it("does not run later steps after a failed install", () => {
    const io = fakeIo(freshRepo());
    io.npm.mockImplementation(() => {
      throw new Error("Command failed: npm install");
    });
    expect(main({ root: ROOT, io, log: log() })).toBe(1);
    expect(io.copy).not.toHaveBeenCalled();
    expect(io.npmCapture).not.toHaveBeenCalled();
  });

  it("never prints the generated secret or database credentials", () => {
    const io = fakeIo({ ...freshRepo(), env: { DATABASE_URL: "postgresql://admin:hunter2@db:5432/x" } });
    const out = log();
    main({ root: ROOT, io, log: out });
    const printed = JSON.stringify([out.info.mock.calls, out.error.mock.calls]);
    expect(printed).not.toContain("generated-secret");
    expect(printed).not.toContain("hunter2");
    expect(printed).not.toContain("admin");
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

  it("exposes the process environment by default", () => {
    expect(createIo(tempRoot()).env).toBe(process.env);
  });

  it("generates a 32-byte base64 secret each time", () => {
    const io = createIo(tempRoot());
    const [first, second] = [io.secret(), io.secret()];
    expect(Buffer.from(first, "base64")).toHaveLength(32);
    expect(first).not.toBe(second);
  });

  it("runs npm in the repo root, streaming output", () => {
    const io = createIo("/some/root", { npm_execpath: "/npm/npm-cli.js" });
    io.npm(["install"]);
    expect(execFileSync).toHaveBeenCalledWith(process.execPath, ["/npm/npm-cli.js", "install"], { cwd: "/some/root", stdio: "inherit" });
  });

  it("captures stdout as text while stderr streams to the terminal", () => {
    vi.mocked(execFileSync).mockReturnValueOnce("out");
    const io = createIo("/some/root", {});
    expect(io.npmCapture(["run", "x"])).toBe("out");
    expect(execFileSync).toHaveBeenCalledWith("npm", ["run", "x"], { cwd: "/some/root", encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  });
});

describe("CLI entry", () => {
  // Fake filesystem: an already set-up repo, so nothing real is read, written or installed.
  const mockSetUpFs = () =>
    vi.doMock("node:fs", () => ({
      existsSync: () => true,
      statSync: () => ({ mtimeMs: 1 }),
      readFileSync: () => "DATABASE_URL=postgresql://localhost:5432/mentio\nJWT_SECRET=mine\n",
      writeFileSync: vi.fn(),
      copyFileSync: vi.fn(),
    }));

  const runEntry = async () => {
    const argv = process.argv;
    process.argv = [argv[0], fileURLToPath(new URL("./setup.mjs", import.meta.url))];
    try {
      await import("./setup.mjs");
      return process.exitCode;
    } finally {
      process.argv = argv;
      process.exitCode = undefined;
    }
  };

  afterEach(() => {
    vi.doUnmock("node:fs");
    vi.mocked(execFileSync).mockReset();
    vi.mocked(execFileSync).mockReturnValue("");
  });

  it("sets up the repo root and sets the exit code when executed directly", async () => {
    vi.resetModules();
    mockSetUpFs();
    vi.mocked(execFileSync).mockReturnValue(NO_PENDING);
    const stdout = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    expect(await runEntry()).toBe(0);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("Setup complete"));
    expect(execFileSync).toHaveBeenCalledOnce(); // only the read-only migration:pending probe
  });

  it("reports a failure on stderr and exits non-zero", async () => {
    vi.resetModules();
    mockSetUpFs();
    vi.mocked(execFileSync).mockImplementation(() => {
      throw Object.assign(new Error("Command failed: node npm-cli.js run mikro-orm"), { status: 1 });
    });
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    vi.spyOn(process.stdout, "write").mockReturnValue(true);
    expect(await runEntry()).toBe(1);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining("✖ Database — `npm run mikro-orm -w @mentio/db -- migration:pending` failed (exit 1) — target:"));
  });
});
