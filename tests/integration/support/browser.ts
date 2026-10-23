// Thin typed wrapper over the agent-browser CLI. Each Browser is an isolated session
// (own Chrome context, cookies, storage); assertions stay in Vitest.
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { ARTIFACTS_DIR, REPO_ROOT } from "./paths";

const run = promisify(execFile);
const BIN = `${REPO_ROOT}/node_modules/.bin/agent-browser`;

interface CliResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export class Browser {
  readonly session = `it-${randomUUID().slice(0, 8)}`;

  async command<T = unknown>(...args: string[]): Promise<T> {
    let stdout: string;
    try {
      ({ stdout } = await run(BIN, ["--session", this.session, "--json", ...args]));
    } catch (error) {
      // Non-zero exit still prints the JSON result; fall through to its error message.
      stdout = (error as { stdout?: string }).stdout ?? "";
      if (!stdout) throw error;
    }
    const result = JSON.parse(stdout) as CliResult<T>;
    if (!result.success) throw new Error(`agent-browser ${args.join(" ")}: ${result.error}`);
    return result.data as T;
  }

  open(url: string) {
    return this.command("open", url);
  }

  async waitForText(text: string) {
    await this.command("wait", "--text", text);
  }

  async text(selector: string): Promise<string> {
    return (await this.command<{ text: string }>("get", "text", selector)).text;
  }

  async title(): Promise<string> {
    return (await this.command<{ title: string }>("get", "title")).title;
  }

  setCookie(name: string, value: string, url: string) {
    return this.command("cookies", "set", name, value, "--url", url, "--httpOnly", "--sameSite", "Lax");
  }

  /** Saves a screenshot under the CI artifacts dir; call from a failure path. */
  screenshot(name: string) {
    return this.command("screenshot", `${ARTIFACTS_DIR}/${name}.png`, "--full");
  }

  async close() {
    await this.command("close").catch(() => undefined);
  }
}
