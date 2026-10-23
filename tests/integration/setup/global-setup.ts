// Boots the stack once per integration run: ephemeral Postgres (testcontainers, or
// TEST_DATABASE_URL without Docker) → migrations → production `next start`.
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { spawn, execFile, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { createServer } from "node:net";
import { promisify } from "node:util";
import type { TestProject } from "vitest/node";
import { ARTIFACTS_DIR, REPO_ROOT } from "../support/paths";

const POSTGRES_IMAGE = "postgres:17-alpine";
const SERVER_READY_TIMEOUT_MS = 60_000;

const run = promisify(execFile);

export default async function setup(project: TestProject) {
  if (!existsSync(`${REPO_ROOT}/packages/app/.next/BUILD_ID`)) {
    throw new Error("No production build found — run `npm run build` before `npm run test:integration`.");
  }
  mkdirSync(ARTIFACTS_DIR, { recursive: true });

  let container: StartedPostgreSqlContainer | undefined;
  let server: ChildProcess | undefined;

  const teardown = async () => {
    if (server?.pid) stopProcessGroup(server.pid);
    await container?.stop();
  };

  try {
    let databaseUrl = process.env.TEST_DATABASE_URL;
    if (!databaseUrl) {
      container = await new PostgreSqlContainer(POSTGRES_IMAGE).withDatabase("mentio_test").start();
      databaseUrl = container.getConnectionUri();
    }

    // Explicit env for every child: the shell may export another project's DATABASE_URL
    // and real env vars take precedence over `.env`.
    const jwtSecret = randomBytes(32).toString("base64");
    const env = { ...process.env, DATABASE_URL: databaseUrl, JWT_SECRET: jwtSecret, LOG_LEVEL: "warn" };

    await run("npm", ["run", "db:migrate"], { cwd: REPO_ROOT, env });

    const port = await freePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    const log = createWriteStream(`${ARTIFACTS_DIR}/server.log`);
    server = spawn("npm", ["run", "start", "--", "--port", String(port), "--hostname", "127.0.0.1"], {
      cwd: REPO_ROOT,
      env,
      // Own process group so teardown stops npm, next and its workers together.
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout?.pipe(log);
    server.stderr?.pipe(log);
    await waitForHealthy(baseUrl, server);

    project.provide("baseUrl", baseUrl);
    project.provide("databaseUrl", databaseUrl);
    project.provide("jwtSecret", jwtSecret);
  } catch (error) {
    await teardown();
    throw error;
  }

  return teardown;
}

function stopProcessGroup(pid: number) {
  try {
    process.kill(-pid, "SIGTERM");
  } catch (error) {
    // Already exited.
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
  }
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() => (typeof address === "object" && address ? resolve(address.port) : reject(new Error("no port"))));
    });
  });
}

async function waitForHealthy(baseUrl: string, server: ChildProcess) {
  const deadline = Date.now() + SERVER_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`next start exited with code ${server.exitCode}; see ${ARTIFACTS_DIR}/server.log`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      const body = (await response.json()) as { ok: boolean; data?: { database: string } };
      if (body.ok && body.data?.database === "up") return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server at ${baseUrl} not healthy after ${SERVER_READY_TIMEOUT_MS} ms; see ${ARTIFACTS_DIR}/server.log`);
}

declare module "vitest" {
  export interface ProvidedContext {
    baseUrl: string;
    databaseUrl: string;
    jwtSecret: string;
  }
}
