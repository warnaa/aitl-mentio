// One-command local setup (`npm run setup`): the README "Getting started" steps, each one
// skipped when it has already been done, so running it again is safe.
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// MikroORM 7 needs Node >= 22.17 (the README requirement).
const MIN_NODE = { major: 22, minor: 17 };
const JWT_SECRET_BYTES = 32;
const DEFAULT_PG_PORT = "5432";

/** Node version gate. Throws with the reason; returns the detail line when supported. */
export function checkNode(version = process.versions.node) {
  const [major, minor] = version.split(".").map(Number);
  const isSupported = major > MIN_NODE.major || (major === MIN_NODE.major && minor >= MIN_NODE.minor);
  if (!isSupported) throw new Error(`Node.js ${version} is too old (need >= ${MIN_NODE.major}.${MIN_NODE.minor})`);
  return { status: "ok", detail: `Node.js ${version}` };
}

/** Value of `KEY=` in env-file text, with surrounding quotes removed as Node's parser does; `undefined` when absent. */
export function readEnvValue(content, key) {
  const match = new RegExp(`^${key}=(.*)$`, "m").exec(content);
  if (!match) return undefined;
  const value = match[1].trim();
  return /^(["'`]).*\1$/.test(value) ? value.slice(1, -1) : value;
}

/**
 * Sets `KEY=value` in env-file text only when the key is missing or empty (`KEY=` and `KEY=""`
 * count as unset, as in `packages/db/src/env.ts`). Every other line, and any existing value, is
 * kept. `makeValue` is only called when a value is actually written.
 */
export function fillEmptyValue(content, key, makeValue) {
  const current = readEnvValue(content, key);
  if (current) return { content, changed: false };
  const line = `${key}=${makeValue()}`;
  if (current === undefined) {
    return { content: `${content}${content === "" || content.endsWith("\n") ? "" : "\n"}${line}\n`, changed: true };
  }
  return { content: content.replace(new RegExp(`^${key}=.*$`, "m"), () => line), changed: true };
}

/**
 * The database migrations will run against, without credentials. An exported `DATABASE_URL`
 * (even an empty one) wins over `.env`, because `process.loadEnvFile` never overrides it.
 */
export function describeDatabaseTarget(envFileContent, env) {
  const fromFile = readEnvValue(envFileContent, "DATABASE_URL");
  const isExported = env.DATABASE_URL !== undefined;
  const url = isExported ? env.DATABASE_URL : fromFile;
  let target = "an invalid DATABASE_URL";
  try {
    const parsed = new URL(url);
    target = `${parsed.hostname}:${parsed.port || DEFAULT_PG_PORT}${parsed.pathname}`;
  } catch {
    // Not a URL: the migration command reports the validation error itself.
  }
  if (!isExported) return `${target} (DATABASE_URL from .env)`;
  const overridesFile = fromFile !== undefined && fromFile !== url;
  return `${target} (DATABASE_URL exported in your shell${overridesFile ? ", overriding .env" : ""})`;
}

/**
 * `npm <args>` as an executable + argv. Under `npm run`, `npm_execpath` points at npm's JS entry,
 * which runs through Node on every platform; a bare `npm` is `npm.cmd` on Windows and cannot be
 * spawned without a shell.
 */
export function npmCommand(args, env = process.env, execPath = process.execPath) {
  const npmCli = env.npm_execpath;
  if (npmCli && /\.[cm]?js$/.test(npmCli)) return [execPath, [npmCli, ...args]];
  return ["npm", args];
}

/** `npm install`, unless the installed tree is at least as new as the lockfile. */
export function installDependencies(root, io) {
  const installed = join(root, "node_modules", ".package-lock.json");
  if (io.exists(installed) && io.mtime(installed) >= io.mtime(join(root, "package-lock.json"))) {
    return { status: "skipped", detail: "dependencies already installed" };
  }
  io.npm(["install"]);
  return { status: "done", detail: "npm install" };
}

/** Creates `.env` from `.env.example` when missing and generates `JWT_SECRET` when empty. */
export function prepareEnv(root, io) {
  const envFile = join(root, ".env");
  const done = [];
  if (!io.exists(envFile)) {
    io.copy(join(root, ".env.example"), envFile);
    done.push("created .env from .env.example");
  }
  const { content, changed } = fillEmptyValue(io.read(envFile), "JWT_SECRET", io.secret);
  if (changed) {
    io.write(envFile, content);
    done.push("generated JWT_SECRET");
  }
  if (done.length === 0) return { status: "skipped", detail: ".env exists and JWT_SECRET is set" };
  return { status: "done", detail: done.join(", ") };
}

/**
 * Applies pending migrations, naming the target database in both outcomes. `migration:pending`
 * does not connect when the server is unreachable (it lists every migration as pending), so a
 * connection failure surfaces from `db:migrate`, whose output streams to the terminal.
 */
export function migrateDatabase(root, io) {
  const target = describeDatabaseTarget(io.read(join(root, ".env")), io.env);
  try {
    const pending = io.npmCapture(["run", "mikro-orm", "-w", "@mentio/db", "--", "migration:pending"]);
    if (pending.includes("No pending migrations")) return { status: "skipped", detail: `no pending migrations in ${target}` };
    io.npm(["run", "db:migrate"]);
  } catch (error) {
    throw new Error(`${error.message.split("\n")[0]} — target: ${target}`, { cause: error });
  }
  return { status: "done", detail: `applied pending migrations to ${target}` };
}

const STEPS = [
  { name: "Node.js", run: () => checkNode(), hint: "Install Node.js >= 22.17 (see .nvmrc), then run `npm run setup` again." },
  { name: "Dependencies", run: installDependencies, hint: "Fix the npm error above, then run `npm run setup` again." },
  { name: "Environment", run: prepareEnv, hint: "Check that .env.example exists and .env is writable, then run `npm run setup` again." },
  {
    name: "Database",
    run: migrateDatabase,
    hint:
      "Start PostgreSQL, create the database (e.g. `createdb mentio`), and fix DATABASE_URL where the target above says it " +
      "comes from (an exported variable wins over .env; `unset DATABASE_URL` to use .env), then run `npm run setup` again.",
  },
];

/** Runs every step in order, stopping at the first failure; returns the process exit code. */
export function main({ root, io, log }) {
  for (const step of STEPS) {
    try {
      const { status, detail } = step.run(root, io);
      log.info(`${status === "skipped" ? "↷" : "✔"} ${step.name} — ${status === "skipped" ? `skipped (${detail})` : detail}`);
    } catch (error) {
      // First line only: the command's own output has already streamed to the terminal.
      log.error(`✖ ${step.name} — ${error.message.split("\n")[0]}`);
      log.error(step.hint);
      return 1;
    }
  }
  log.info("Setup complete. Next: `npm run dev` → http://localhost:3000");
  return 0;
}

/** Runs npm, reporting a failure as the command the user would type rather than the resolved Node/npm-cli paths. */
export function execNpm(args, options, env = process.env, exec = execFileSync) {
  try {
    return exec(...npmCommand(args, env), options);
  } catch (error) {
    const reason = error.status != null ? `exit ${error.status}` : (error.code ?? "did not run");
    throw new Error(`\`npm ${args.join(" ")}\` failed (${reason})`, { cause: error });
  }
}

/** Filesystem, environment and process access, injected so tests never touch the real repo or run npm. */
export function createIo(root, env = process.env) {
  return {
    env,
    exists: existsSync,
    mtime: (file) => statSync(file).mtimeMs,
    read: (file) => readFileSync(file, "utf8"),
    write: (file, content) => writeFileSync(file, content),
    copy: copyFileSync,
    secret: () => randomBytes(JWT_SECRET_BYTES).toString("base64"),
    npm: (args) => execNpm(args, { cwd: root, stdio: "inherit" }, env),
    // stdout is parsed; stderr streams to the terminal so a failure shows its real cause.
    npmCapture: (args) => execNpm(args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }, env),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  process.exitCode = main({
    root,
    io: createIo(root),
    log: { info: (line) => process.stdout.write(`${line}\n`), error: (line) => process.stderr.write(`${line}\n`) },
  });
}
