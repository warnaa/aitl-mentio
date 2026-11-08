// Local verification runner: bounded owned process trees and UTF-8 evidence.
import { spawn, execFileSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
const modes = {
  regression: ['test:integration -- --testNamePattern=NOTES-009 --reporter=default --reporter=json --outputFile=test-results/integration/pool-before-fix.json'],
  gate: ['typecheck', 'lint', 'test', 'build', 'test:unit:coverage'],
  focused: ['test:integration -- --testNamePattern=NOTES-00[79]|NOTES-010 --reporter=default --reporter=json --outputFile=test-results/integration/pool-results.json'],
  integration: ['test:integration -- --reporter=default --reporter=json --outputFile=test-results/integration/final-results.json'],
};
const mode = process.argv[2];
if (!Object.hasOwn(modes, mode)) throw new Error('Expected gate, focused, regression or integration');
const log = createWriteStream(new URL(`recovery-${mode}.log`, import.meta.url));
const write = value => { log.write(value); process.stdout.write(value); };
for (const command of modes[mode]) {
  write(`\n${new Date().toISOString()} npm run ${command}\n`);
  // Commands are fixed literals. Quoting protects the regex pipe from cmd.exe.
  const shellCommand = `npm run ${command.replace('--testNamePattern=NOTES-00[79]|NOTES-010', '--testNamePattern="NOTES-00[79]|NOTES-010"')}`;
  const child = spawn(shellCommand, { shell: true, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', data => log.write(data));
  child.stderr.on('data', data => log.write(data));
  const timer = setTimeout(() => {
    write(`TIMEOUT owned PID ${child.pid}\n`);
    if (process.platform === 'win32') execFileSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true });
    else child.kill('SIGKILL');
  }, mode === 'integration' ? 1_500_000 : 600_000);
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  clearTimeout(timer);
  write(`Exit ${code}\n`);
  if (code !== 0) { process.exitCode = 1; break; }
}
log.end();
