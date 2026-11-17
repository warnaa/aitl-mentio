import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';

/**
 * Real I/O for `runRelease`. Reads run from the current directory (the repository
 * root in the workflow). Workflow outputs go to `$GITHUB_OUTPUT`, or to stdout when
 * the script is run by hand.
 */
export function createNodeEffects({
  env = process.env,
  exec = execFileSync,
  stdout = process.stdout,
} = {}) {
  return {
    env,
    readText: (path) => readFileSync(path, 'utf8'),
    writeText: (path, text) => writeFileSync(path, text),
    listTags: () => exec('git', ['tag', '--list', 'v*'], { encoding: 'utf8' })
      .split('\n')
      .map((tag) => tag.trim())
      .filter(Boolean),
    appendOutput: (text) => {
      if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `${text}\n`);
      else stdout.write(`${text}\n`);
    },
  };
}
