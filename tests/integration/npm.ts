import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const integrationRoot = process.cwd();
export const isWindows = process.platform === 'win32';

/**
 * Command and arguments for an npm invocation. Node refuses to spawn `npm.cmd` without
 * a shell (EINVAL, CVE-2024-27980) and deprecates passing an argument array alongside
 * `shell` (DEP0190), so on Windows the call becomes one shell command string. Every
 * npm argument here is a fixed literal, so the shell has nothing to interpret.
 */
export function npmInvocation(args: string[]): [string, string[]] {
  return isWindows ? [`npm.cmd ${args.join(' ')}`, []] : ['npm', args];
}

/** Run one npm command from the repository root and wait for it to finish; returns its stdout. */
export async function runNpm(args: string[], environment: NodeJS.ProcessEnv): Promise<string> {
  const { stdout } = await execFileAsync(...npmInvocation(args), {
    cwd: integrationRoot,
    env: environment,
    shell: isWindows,
    maxBuffer: 20 * 1024 * 1024,
    timeout: 180_000,
  });
  return stdout;
}
