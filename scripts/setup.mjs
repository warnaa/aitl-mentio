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

/** Node version gate. Throws with the reason; returns the detail line when supported. */
export function checkNode(version = process.versions.node) {
  const [major, minor] = version.split(".").map(Number);
  const isSupported = major > MIN_NODE.major || (major === MIN_NODE.major && minor >= MIN_NODE.minor);
  if (!isSupported) throw new Error(`Node.js ${version} is too old (need >= ${MIN_NODE.major}.${MIN_NODE.minor})`);
  return { status: "ok", detail: `Node.js ${version}` };
}

/**
 * Sets `KEY=value` in env-file text only when the key is missing or empty (`KEY=` counts as
 * unset, as in `packages/db/src/env.ts`). Every other line, and any existing value, is kept.
 */
export function fillEmptyValue(content, key, value) {
  const line = new RegExp(`^${key}=(.*)$`, "m");
  const match = line.exec(content);
  if (!match) return { content: `${content}${content === "" || content.endsWith("\n") ? "" : "\n"}${key}=${value}\n`, changed: true };
  if (match[1].trim() !== "") return { content, changed: false };
  return { content: content.replace(line, `${key}=${value}`), changed: true };
}

/** `npm install`, unless the installed tree is at least as new as the lockfile. */
export function installDependencies(root, io) {
  const installed = join(root, "node_modules", ".package-lock.json");
  if (io.exists(installed) && io.mtime(installed) >= io.mtime(join(root, "package-lock.json"))) {
    return { status: "skipped", detail: "dependencies already installed" };
  }
  io.run("npm", ["install"]);
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
  const { content, changed } = fillEmptyValue(io.read(envFile), "JWT_SECRET", io.secret());
  if (changed) {
    io.write(envFile, content);
    done.push("generated JWT_SECRET");
  }
  if (done.length === 0) return { status: "skipped", detail: ".env exists and JWT_SECRET is set" };
  return { status: "done", detail: done.join(", ") };
}

/** Applies pending migrations; `migration:pending` also proves the database is reachable. */
export function migrateDatabase(_root, io) {
  const pending = io.capture("npm", ["run", "mikro-orm", "-w", "@mentio/db", "--", "migration:pending"]);
  if (pending.includes("No pending migrations")) return { status: "skipped", detail: "no pending migrations" };
  io.run("npm", ["run", "db:migrate"]);
  return { status: "done", detail: "applied pending migrations" };
}

const STEPS = [
  { name: "Node.js", run: () => checkNode(), hint: "Install Node.js >= 22.17 (see .nvmrc), then run `npm run setup` again." },
  { name: "Dependencies", run: installDependencies, hint: "Fix the npm error above, then run `npm run setup` again." },
  { name: "Environment", run: prepareEnv, hint: "Check that .env.example exists and .env is writable, then run `npm run setup` again." },
  {
    name: "Database",
    run: migrateDatabase,
    hint: "Start PostgreSQL, create the database (e.g. `createdb mentio`), and check DATABASE_URL in .env, then run `npm run setup` again.",
  },
];

/** Runs every step in order, stopping at the first failure; returns the process exit code. */
export function main({ root, io, log }) {
  for (const step of STEPS) {
    try {
      const { status, detail } = step.run(root, io);
      log.info(`${status === "skipped" ? "↷" : "✔"} ${step.name} — ${status === "skipped" ? `skipped (${detail})` : detail}`);
    } catch (error) {
      // First line only: a failed child process appends its raw stderr to the message.
      log.error(`✖ ${step.name} — ${error.message.split("\n")[0]}`);
      log.error(step.hint);
      return 1;
    }
  }
  log.info("Setup complete. Next: `npm run dev` → http://localhost:3000");
  return 0;
}

/** Filesystem and process access, injected so tests never touch the real repo or run npm. */
export function createIo(root) {
  return {
    exists: existsSync,
    mtime: (file) => statSync(file).mtimeMs,
    read: (file) => readFileSync(file, "utf8"),
    write: (file, content) => writeFileSync(file, content),
    copy: copyFileSync,
    secret: () => randomBytes(JWT_SECRET_BYTES).toString("base64"),
    run: (command, args) => execFileSync(command, args, { cwd: root, stdio: "inherit" }),
    capture: (command, args) => execFileSync(command, args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }),
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
