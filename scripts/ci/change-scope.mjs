import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function requiresApplicationChecks(paths) {
  return paths.length === 0 || paths.some((path) => !(
    path.endsWith('.md') || path === '.gitignore' ||
    (/^\.ai\/(runs|qa|analysis|lessons)\//.test(path) &&
      /\.(png|jpe?g|gif|webp|svg|pdf|mp4|webm|log|txt|csv)$/.test(path))
  ));
}

export function classifyChanges(base, head, cwd = process.cwd()) {
  if (![base, head].every((sha) => /^[a-f0-9]{40,64}$/.test(sha ?? ''))) {
    throw new Error('Expected base and head commit SHAs');
  }
  // Three dots inspect the entire PR. No renames means code renamed to .md
  // still contributes its deleted code path and cannot bypass application CI.
  const paths = execFileSync('git', [
    'diff', '--no-renames', '--name-only', '-z', `${base}...${head}`, '--',
  ], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).split('\0').filter(Boolean);
  return requiresApplicationChecks(paths);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`application=${classifyChanges(process.argv[2], process.argv[3])}`);
}
