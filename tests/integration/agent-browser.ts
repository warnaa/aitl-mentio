import { spawn } from 'node:child_process';
import { closeSync, openSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const cliPath = resolve('node_modules/agent-browser/bin/agent-browser.js');
const commandTimeoutMs = 60_000;

export const integrationArtifactsDirectory = resolve('test-results/integration');
const commandOutputDirectory = resolve(integrationArtifactsDirectory, 'agent-browser');
let commandSequence = 0;

/**
 * Run one agent-browser command and return its trimmed stdout.
 *
 * The first command of a session starts a long-lived daemon that inherits the CLI's
 * stdio. On Windows the daemon then holds a stdout *pipe* open after the CLI exits, so
 * anything that waits for the pipe to close (`execFile`) hangs until it times out.
 * Output therefore goes to per-command files under the git-ignored artifacts
 * directory, and completion is the CLI's own exit.
 */
export async function runAgentBrowser(
  session: string,
  ...args: string[]
): Promise<string> {
  await mkdir(commandOutputDirectory, { recursive: true });
  const outputPrefix = resolve(commandOutputDirectory, `${session}-${++commandSequence}`);
  const stdoutPath = `${outputPrefix}.stdout.txt`;
  const stderrPath = `${outputPrefix}.stderr.txt`;
  const stdoutFd = openSync(stdoutPath, 'w');
  const stderrFd = openSync(stderrPath, 'w');

  let code: number | null;
  try {
    code = await new Promise<number | null>((resolveExit, reject) => {
      const child = spawn(process.execPath, [cliPath, '--session', session, ...args], {
        cwd: process.cwd(),
        stdio: ['ignore', stdoutFd, stderrFd],
        windowsHide: true,
      });
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`agent-browser ${args.join(' ')} timed out after ${commandTimeoutMs}ms`));
      }, commandTimeoutMs);
      child.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once('exit', (exitCode) => {
        clearTimeout(timer);
        resolveExit(exitCode);
      });
    });
  } finally {
    closeSync(stdoutFd);
    closeSync(stderrFd);
  }

  const stdout = await readFile(stdoutPath, 'utf8');
  if (code !== 0) {
    const stderr = await readFile(stderrPath, 'utf8');
    throw new Error(`agent-browser ${args.join(' ')} exited with ${code}: ${stderr.trim()}`);
  }
  return stdout.trim();
}

export async function closeAgentBrowser(session: string): Promise<void> {
  try {
    await runAgentBrowser(session, 'close');
  } catch {
    // Cleanup is best-effort; the original test/setup failure remains authoritative.
  }
}

export async function captureBrowserFailure(
  session: string,
  artifactPrefix: string,
): Promise<void> {
  await mkdir(integrationArtifactsDirectory, { recursive: true });
  const outputs: string[] = [];

  for (const [label, command] of [
    ['errors', ['errors']],
    ['console', ['console']],
  ] as const) {
    try {
      outputs.push(`${label}:\n${await runAgentBrowser(session, ...command)}`);
    } catch (error) {
      outputs.push(`${label}: unable to collect (${String(error)})`);
    }
  }

  try {
    await runAgentBrowser(
      session,
      'screenshot',
      resolve(integrationArtifactsDirectory, `${artifactPrefix}-failure.png`),
      '--full',
    );
  } catch (error) {
    outputs.push(`screenshot: unable to collect (${String(error)})`);
  }

  await writeFile(
    resolve(integrationArtifactsDirectory, `${artifactPrefix}-diagnostics.txt`),
    `${outputs.join('\n\n')}\n`,
    'utf8',
  );
}
