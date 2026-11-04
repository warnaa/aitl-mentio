import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const errors = [];
const ignored = new Set([
  '.git', '.agents', '.claude', '.codex', 'node_modules', '.next', 'dist',
  'build', 'out', 'storybook-static', 'coverage', 'test-results',
]);

function instructionFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory() && !ignored.has(entry.name)) return instructionFiles(path);
    return entry.isFile() && entry.name === 'AGENTS.md' ? [path] : [];
  });
}

const rootFile = resolve(root, 'AGENTS.md');
if (!existsSync(rootFile)) {
  console.error('Missing root AGENTS.md');
  process.exit(1);
}

const files = instructionFiles(root);
for (const file of files) {
  const content = readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/).length - (content.endsWith('\n') ? 1 : 0);
  const budget = file === rootFile ? 150 : 120;
  if (lines > budget) errors.push(`${relative(root, file)}: ${lines} lines exceeds ${budget}`);
}

// Route targets are repo-relative paths in backticks in the Read column.
const lines = readFileSync(rootFile, 'utf8').split(/\r?\n/);
const header = lines.findIndex((line) => /^\|\s*Task\s*\|\s*Read\s*\|\s*$/.test(line));
const tasks = new Set();
let targets = 0;
if (header === -1 || !/^\|\s*-+\s*\|\s*-+\s*\|\s*$/.test(lines[header + 1] ?? '')) {
  errors.push('Root must contain a | Task | Read | table with a separator row');
} else {
  for (const line of lines.slice(header + 2)) {
    if (!line.startsWith('|')) break;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    const paths = [...(cells[1] ?? '').matchAll(/`([^`]+)`/g)].map((match) => match[1]);
    if (cells.length !== 2 || !cells[0] || !paths.length) {
      errors.push(`Invalid route row: ${line}`);
      continue;
    }
    tasks.add(cells[0]);
    for (const target of paths) {
      targets += 1;
      const path = resolve(root, target);
      const local = relative(root, path);
      if (isAbsolute(target) || local === '..' || local.startsWith(`..${sep}`) || isAbsolute(local)) {
        errors.push(`${cells[0]}: route must stay inside the repo: ${target}`);
      } else if (!existsSync(path) || !statSync(path).isFile()) {
        errors.push(`${cells[0]}: routed file does not exist: ${target}`);
      }
    }
  }
}
for (const task of ['Bug fix', 'New feature', 'Refactor', 'Review']) {
  if (!tasks.has(task)) errors.push(`Missing required route: ${task}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Agent routes OK: ${tasks.size} tasks, ${targets} targets, ${files.length} instruction files within budget.`);
}
