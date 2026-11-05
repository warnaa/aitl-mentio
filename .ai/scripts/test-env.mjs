// om-prepare-test-env: generated entrypoint (contract v2)
// history:
//   2026-11-05 generated: isolated Docker service, lifetime lock and validated reuse.
//   2026-11-05 review: dependency-free owner launch, concurrent boot wait, stable cache snapshots.
//   2026-11-05 repair: use workspace npm start; direct Next from root misloads TS config.
//   2026-11-05 repair: kill timed-out process trees and validate built source before readiness.
import { spawn, execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { closeSync, openSync } from 'node:fs';
import { mkdir, readFile, writeFile, rename, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Project recipe: the same image, migration/seed/build/start and isolated env as
// tests/integration/global-setup.ts. Never load the developer's .env here.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const invokedAsScript = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) process.chdir(root);
const qa = resolve(root, '.ai/qa');
const descriptor = resolve(qa, 'test-env.json');
const cacheFile = resolve(qa, 'test-env-build-cache.json');
const browserFile = resolve(qa, 'test-env-browser.json');
const lock = resolve(qa, 'test-env.lock');
const ownerFile = resolve(lock, 'owner.json');
const runtime = resolve(qa, 'test-env-runtime');
const image = 'postgres:17-alpine';
const startScript = '.ai/scripts/test-env-up.ps1';
const stopScript = '.ai/scripts/test-env-down.ps1';
const artifacts = ['packages/app/.next/BUILD_ID', 'packages/app/.next/server/app/api/health/route.js', 'packages/app/.next/required-server-files.json', 'node_modules/next/package.json'];
const ttl = Number(process.env.TEST_ENV_CACHE_TTL_SECONDS ?? 600);
if (!Number.isFinite(ttl) || ttl < 0) throw new Error('Invalid TEST_ENV_CACHE_TTL_SECONDS');
const [action = 'up', ...flags] = process.argv.slice(2);
if (invokedAsScript && (!['up', 'down', 'owner', 'fingerprint'].includes(action) ||
    flags.some(flag => !['--force', '--force-rebuild'].includes(flag)))) throw new Error('Unknown test-env argument');
const sleep = ms => new Promise(done => setTimeout(done, ms));
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
const json = async path => { try { return JSON.parse(await readFile(path, 'utf8')); } catch { return null; } };
async function save(path, value) {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, path);
}
export async function fingerprint() {
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root }).toString().split('\0');
  const inputs = files.filter(file => /^(packages\/|tests\/integration\/|package(-lock)?\.json$|tsconfig|next\.config|\.ai\/scripts\/)/.test(file));
  const entries = [];
  for (const file of inputs.sort()) {
    try { const info = await stat(resolve(root, file)); entries.push(`${file}:${info.size}:${info.mtimeMs}`); }
    catch { entries.push(`${file}:missing`); }
  }
  entries.push(`node:${process.version}`, 'NODE_ENV:production');
  return createHash('sha256').update(entries.join('\n')).digest('hex');
}
export async function ensureSourceUnchanged(expected) {
  if (await fingerprint() !== expected) throw new Error('Source changed during preparation/build/startup; retry startup.');
  return expected;
}
export async function command(executable, args, env = process.env, logName = 'commands', timeout = 600_000) {
  const fd = openSync(resolve(runtime, `${logName}.log`), 'a');
  try {
    await new Promise((done, reject) => {
      const child = spawn(executable, args, { cwd: root, env, detached: process.platform !== 'win32', windowsHide: true, stdio: ['ignore', fd, fd] });
      const timer = setTimeout(() => {
        try {
          // Kill the whole owned tree before allowing the owner to release its lock.
          // Killing only cmd.exe leaves npm/build descendants modifying shared artifacts.
          if (process.platform === 'win32') {
            execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, timeout: 15_000, stdio: 'ignore' });
          } else process.kill(-child.pid, 'SIGKILL');
        } catch (error) {
          reject(new Error(`${logName} timeout cleanup failed: ${error.message}`));
          return;
        }
        reject(new Error(`${logName} timed out; see local runtime log`));
      }, timeout);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', code => {
        clearTimeout(timer);
        if (code === 0) done();
        else reject(new Error(`${logName} exited ${code}; see .ai/qa/test-env-runtime/${logName}.log`));
      });
    });
  } finally { closeSync(fd); }
}
function docker(args) {
  return execFileSync('docker', args, { cwd: root, windowsHide: true, timeout: 30_000, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
}
async function npm(args, env) {
  if (process.platform === 'win32') {
    await command(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `npm.cmd ${args.join(' ')}`], env);
  } else await command('npm', args, env);
}
async function freePort() {
  const server = createServer();
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
  const port = server.address().port;
  await new Promise(done => server.close(done));
  return port;
}
async function request(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(5000) });
}
async function ready(state) {
  try {
    if (!alive(state.ownerPid) || !alive(state.app.pid) || state.projectRoot !== root) return false;
    const shell = await request(`${state.baseUrl}/sign-in`);
    if (!shell.ok) return false;
    const response = await request(`${state.baseUrl}/api/health`);
    const health = await response.json();
    if (!response.ok || health.status !== 'ok' || health.database !== 'up') return false;
    // Exercise OAuth state/cookie validation and an operator-only database API.
    const start = await request(`${state.baseUrl}/api/auth/github?login=mock-operator`, { redirect: 'manual' });
    const callbackUrl = new URL(start.headers.get('location'), state.baseUrl);
    if (callbackUrl.origin !== state.baseUrl || callbackUrl.pathname !== '/api/auth/github/callback') return false;
    const cookies = start.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
    const callback = await request(callbackUrl, { redirect: 'manual', headers: { cookie: cookies } });
    const session = callback.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
    if (!session.includes('devmentor_session=')) return false;
    const users = await request(`${state.baseUrl}/api/users`, { headers: { cookie: session } });
    return users.ok;
  } catch { return false; }
}
async function stop() {
  const owner = await json(ownerFile);
  if (!owner) {
    const state = await json(descriptor);
    if (state?.status === 'running') throw new Error('Owner record missing; refusing unverified process/container cleanup.');
    return;
  }
  if (owner.source !== root) throw new Error('Owner belongs to a different checkout');
  if (!alive(owner.pid)) throw new Error('Owner died; inspect scoped runtime resources before retrying. No arbitrary PID will be killed.');
  await writeFile(resolve(lock, `stop-${owner.runId}`), 'stop\n');
  for (let i = 0; i < 120; i++) {
    if (!(await json(ownerFile))) return;
    await sleep(500);
  }
  throw new Error('Timed out waiting for environment owner cleanup');
}
async function ensureBrowser() {
  let browser = await json(browserFile);
  const version = (await json(resolve(root, 'node_modules/agent-browser/package.json')))?.version ?? 'unknown';
  if (browser?.installed && browser.version === version) return browser;
  const cli = resolve(root, 'node_modules/agent-browser/bin/agent-browser.js');
  browser = { provider: 'agent-browser', installed: false, command: 'node node_modules/agent-browser/bin/agent-browser.js', version, descriptor: '.ai/browsers/agent-browser.md', notes: '' };
  try {
    await command(process.execPath, [cli, 'install'], process.env, 'browser-install');
    await command(process.execPath, [cli, 'doctor', '--json'], process.env, 'browser-doctor', 90_000);
    browser.installed = true;
  } catch (error) { browser.notes = error.message; }
  await save(browserFile, browser);
  return browser;
}
async function own() {
  const started = Date.now();
  const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  let app;
  let container;
  let state;
  let ownsLock = false;
  let failed = false;
  let stopping = false;
  const onSignal = () => { stopping = true; };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  try {
    try { await mkdir(lock); ownsLock = true; }
    catch (error) { if (error.code === 'EEXIST') return; throw error; }
    await save(ownerFile, { pid: process.pid, source: root, runId, acquiredAt: new Date().toISOString() });
    // Fail before expensive preparation when Docker is unavailable.
    docker(['info', '--format', '{{.ServerVersion}}']);
    let sourceFingerprint = await fingerprint();
    const cached = await json(cacheFile);
    const artifactsPresent = (await Promise.all(artifacts.map(async path => { try { return (await stat(path)).size > 0; } catch { return false; } }))).every(Boolean);
    const reuseBuild = !flags.includes('--force-rebuild') && cached?.projectRoot === root && cached?.sourceFingerprint === sourceFingerprint && artifactsPresent;
    if (!reuseBuild) await npm(['ci'], process.env);
    sourceFingerprint = await fingerprint();
    if (reuseBuild && sourceFingerprint !== cached.sourceFingerprint) throw new Error('Source changed during preparation; retry startup.');
    const { integrationChildEnvironment } = await import('../../tests/integration/environment.ts');
    const port = await freePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    container = `devmentor-qa-${runId}`;
    docker(['run', '--detach', '--rm', '--name', container, '--label', `devmentor.qa.root=${root}`, '--label', `devmentor.qa.run=${runId}`, '--publish', '127.0.0.1::5432', '--env', 'POSTGRES_DB=devmentor_test', '--env', 'POSTGRES_USER=devmentor', '--env', 'POSTGRES_PASSWORD=devmentor', image]);
    const dbPort = Number(docker(['port', container, '5432/tcp']).split(':').at(-1));
    if (!Number.isInteger(dbPort) || dbPort < 1) throw new Error('Invalid database port');
    let databaseReady = false;
    for (let i = 0; i < 120; i++) {
      try { docker(['exec', container, 'pg_isready', '-U', 'devmentor', '-d', 'devmentor_test']); databaseReady = true; break; } catch { await sleep(500); }
    }
    if (!databaseReady) throw new Error('PostgreSQL did not become ready');
    const databaseUrl = `postgres://devmentor:devmentor@127.0.0.1:${dbPort}/devmentor_test`;
    const env = integrationChildEnvironment(databaseUrl, baseUrl);
    await npm(['run', 'db:migrate'], env);
    await npm(['run', 'db:seed'], env);
    await npm(['run', 'db:seed'], env);
    if (!reuseBuild) {
      await npm(['run', 'build'], env);
      await ensureSourceUnchanged(sourceFingerprint);
      await save(cacheFile, { builtAt: new Date().toISOString(), sourceFingerprint, projectRoot: root, artifactPaths: artifacts });
    }
    const browser = await ensureBrowser();
    const fd = openSync(resolve(runtime, 'app.log'), 'w');
    try {
      const { npmInvocation, isWindows } = await import('../../tests/integration/npm.ts');
      app = spawn(...npmInvocation(['run', 'start', '--workspace', '@devmentor/app', '--', '--hostname', '127.0.0.1', '--port', String(port)]), { cwd: root, env, shell: isWindows, detached: !isWindows, windowsHide: true, stdio: ['ignore', fd, fd] });
    } finally { closeSync(fd); }
    let appError;
    app.on('error', error => { appError = error; });
    state = { version: 1, runId, status: 'starting', mode: 'ephemeral', baseUrl, startedByThisRepo: true, projectRoot: root, ownerPid: process.pid, startScript, stopScript, app: { startCommand: 'npm run start --workspace @devmentor/app -- --hostname 127.0.0.1 --port <free-port>', port, healthPath: '/api/health', pid: app.pid }, services: [{ type: 'postgres', image, host: '127.0.0.1', port: dbPort, container, url: databaseUrl, env: { DATABASE_URL: databaseUrl } }], credentials: [{ role: 'operator', username: 'mock-operator@devmentor.test', loginPath: '/api/auth/github?login=mock-operator' }, { role: 'mentee', username: 'mock-mentee@devmentor.test', loginPath: '/api/auth/github?login=mock-mentee' }], credentialsFile: '.ai/qa/test-env.env', browser, testRunner: { name: 'vitest + agent-browser', config: 'vitest.integration.config.mts', command: 'npm run test:integration', notes: 'Native suite provisions its own isolated instance.' }, platform: process.platform, startedAt: new Date().toISOString(), sourceFingerprint, buildReused: reuseBuild, notes: 'Disposable synthetic data; mock GitHub sign-in only; mail logged locally in .ai/qa/test-env-runtime/app.log. Lifetime lock protects production build files. Stop this QA environment before running builds or the independent integration suite in the same checkout. Preparation timeouts terminate owned process trees; source edits during startup refuse readiness.' };
    let healthy = false;
    for (let i = 0; i < 120; i++) {
      if (appError || app.exitCode !== null) throw new Error('Application exited before readiness; see app.log');
      if (await ready(state)) { healthy = true; break; }
      await sleep(500);
    }
    if (!healthy) throw new Error('Application readiness failed; see app.log');
    await ensureSourceUnchanged(sourceFingerprint);
    state.status = 'running';
    state.coldSeconds = (Date.now() - started) / 1000;
    await writeFile(resolve(qa, 'test-env.env'), '# Mock GitHub sign-in requires no password.\n');
    await save(descriptor, state);
    while (!stopping) {
      try { await stat(resolve(lock, `stop-${runId}`)); break; } catch { /* no stop request */ }
      if (app.exitCode !== null) throw new Error('QA app exited unexpectedly');
      await sleep(500);
    }
  } catch (error) {
    failed = true;
    console.error(error.message);
    await save(resolve(runtime, 'failure.json'), { message: error.message, at: new Date().toISOString() });
  } finally {
    if (app?.pid && app.exitCode === null) {
      const exited = new Promise(done => app.once('exit', done));
      if (process.platform === 'win32') {
        await command('taskkill', ['/PID', String(app.pid), '/T', '/F'], process.env, 'teardown', 15_000).catch(() => app.kill());
      } else {
        try { process.kill(-app.pid, 'SIGTERM'); } catch { app.kill(); }
      }
      await Promise.race([exited, sleep(5000)]);
      if (app.exitCode === null) app.kill('SIGKILL');
    }
    if (container) {
      try {
        const labels = JSON.parse(docker(['inspect', '--format', '{{json .Config.Labels}}', container]));
        if (labels['devmentor.qa.root'] === root && labels['devmentor.qa.run'] === runId) docker(['rm', '--force', '--volumes', container]);
      } catch { /* Container may already have auto-removed itself. */ }
    }
    if (state) { state.status = failed ? 'failed' : 'stopped'; await save(descriptor, state); }
    if (ownsLock) await rm(lock, { recursive: true, force: true });
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
  }
}
async function up() {
  const started = Date.now();
  const state = await json(descriptor);
  if (!flags.includes('--force') && !flags.includes('--force-rebuild') && state?.status === 'running' && state.sourceFingerprint === await fingerprint() && Date.now() - Date.parse(state.startedAt) < ttl * 1000 && await ready(state)) {
    state.warmSeconds = (Date.now() - started) / 1000;
    state.notes = state.notes.replace(/ Timings:.*$/, '') + ` Timings: cold ${state.coldSeconds}s, warm ${state.warmSeconds}s (reused).`;
    await save(descriptor, state);
    report(state, true);
    return;
  }
  const owner = await json(ownerFile);
  if (owner && alive(owner.pid)) {
    // An owner with no running descriptor is still bootstrapping: join it.
    if (state?.ownerPid !== owner.pid || state.status !== 'running') {
      for (let i = 0; i < 1200; i++) {
        const current = await json(descriptor);
        if (current?.ownerPid === owner.pid && current.status === 'running') {
          if (await ready(current)) { report(current, true); return; }
        }
        const failure = await json(resolve(runtime, 'failure.json'));
        if (failure) throw new Error(failure.message);
        if (!alive(owner.pid)) throw new Error('Concurrent environment owner exited before readiness');
        await sleep(500);
      }
      throw new Error('Timed out waiting for concurrent bootstrap');
    }
    await stop();
  }
  else if (owner) {
    throw new Error('Stale lifetime owner: refusing to rebuild while an orphan app could still use the artifacts. Inspect scoped resources.');
  }
  await rm(resolve(runtime, 'failure.json'), { force: true });
  const fd = openSync(resolve(runtime, 'owner.log'), 'a');
  const worker = spawn(process.execPath, [fileURLToPath(import.meta.url), 'owner', ...flags], { cwd: root, detached: true, windowsHide: true, stdio: ['ignore', fd, fd] });
  closeSync(fd);
  let workerError;
  let workerExited = false;
  worker.once('error', error => { workerError = error; });
  worker.once('exit', () => { workerExited = true; });
  worker.unref();
  for (let i = 0; i < 1200; i++) {
    const failure = await json(resolve(runtime, 'failure.json'));
    if (failure) throw new Error(failure.message);
    if (workerError) throw new Error(`Owner could not start: ${workerError.message}`);
    if (workerExited && !alive((await json(ownerFile))?.pid)) throw new Error('Environment owner exited before readiness; see owner.log');
    const current = await json(descriptor);
    if (current?.status === 'running' && current.runId !== state?.runId && await ready(current)) { report(current, false); return; }
    await sleep(500);
  }
  throw new Error('Bootstrap timed out; inspect .ai/qa/test-env-runtime/owner.log');
}
function report(state, reused) {
  console.log(`TEST_ENV_STATUS=running\nTEST_ENV_BASE_URL=${state.baseUrl}\nTEST_ENV_DESCRIPTOR=.ai/qa/test-env.json\nTEST_ENV_REUSED=${Number(reused)}\nBROWSER_PROVIDER=${state.browser.provider}\nBROWSER_INSTALLED=${Number(state.browser.installed)}\nTEST_ENV_COLD_SECONDS=${state.coldSeconds}\nTEST_ENV_WARM_SECONDS=${state.warmSeconds ?? ''}`);
}
await mkdir(runtime, { recursive: true });
if (invokedAsScript) {
  try {
    if (action === 'fingerprint') console.log(await fingerprint());
    else if (action === 'owner') await own();
    else if (action === 'down') { await stop(); console.log('TEST_ENV_STATUS=stopped'); }
    else await up();
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
