import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Production dependency audit with a narrow, time-boxed allowlist.
//
// `npm audit` has no per-advisory ignore, and lowering `--audit-level` would hide every
// future high advisory. This gate keeps the level at `high` for everything and accepts
// only the advisories listed in `audit-exceptions.json`, each bound to the package that
// carries it, the direct dependencies allowed to reach it and an expiry date.

export const AUDIT_LEVEL = 'high';

const SEVERITY_RANK = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };
const EXPIRY_WARNING_DAYS = 14;
const DAY_MS = 86_400_000;

function expiryEnd(expires) {
  return Date.parse(`${expires}T23:59:59.999Z`);
}

function advisoryId(via) {
  const ghsa = /GHSA(?:-[a-z0-9]{4}){3}/i.exec(via.url ?? '');
  return ghsa ? ghsa[0].toLowerCase() : `npm:${via.source}`;
}

// Walks `effects` upward from a vulnerable package to the direct dependencies that pull
// it into the project. A transitive finding is only ever as narrow as these roots.
function directDependents(nodes, start) {
  const seen = new Set([start]);
  const queue = [start];
  const direct = [];
  while (queue.length > 0) {
    const name = queue.shift();
    const node = nodes[name];
    if (node?.isDirect === true) direct.push(name);
    for (const effect of node?.effects ?? []) {
      if (!seen.has(effect)) {
        seen.add(effect);
        queue.push(effect);
      }
    }
  }
  return direct.sort();
}

export function collectAdvisories(report) {
  const nodes = report.vulnerabilities ?? {};
  const found = new Map();
  for (const [name, node] of Object.entries(nodes)) {
    for (const via of node.via ?? []) {
      if (typeof via !== 'object' || via === null) continue;
      const advisory = {
        id: advisoryId(via),
        package: via.name ?? name,
        severity: via.severity,
        title: via.title ?? 'no title',
        dependents: directDependents(nodes, name),
        fix: node.fixAvailable ?? false,
      };
      found.set(`${advisory.id}|${advisory.package}`, advisory);
    }
  }
  return [...found.values()];
}

export function parseExceptions(data) {
  const entries = data?.exceptions;
  if (!Array.isArray(entries)) throw new Error('audit-exceptions.json needs an "exceptions" array');
  const seen = new Set();
  return entries.map((entry, index) => {
    const where = `audit-exceptions.json exceptions[${index}]`;
    if (!/^ghsa(?:-[a-z0-9]{4}){3}$/.test(entry?.advisory ?? '')) {
      throw new Error(`${where}: "advisory" must be a lowercase GHSA id`);
    }
    for (const field of ['package', 'reason']) {
      if (typeof entry[field] !== 'string' || entry[field].trim() === '') {
        throw new Error(`${where}: "${field}" must be a non-empty string`);
      }
    }
    if (!Array.isArray(entry.dependents) || entry.dependents.length === 0 ||
        entry.dependents.some((name) => typeof name !== 'string' || name === '')) {
      throw new Error(`${where}: "dependents" must list the direct dependencies allowed to reach it`);
    }
    // The round trip rejects dates V8 would roll over, such as 2027-02-30.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.expires ?? '') || Number.isNaN(expiryEnd(entry.expires)) ||
        !new Date(expiryEnd(entry.expires)).toISOString().startsWith(entry.expires)) {
      throw new Error(`${where}: "expires" must be a YYYY-MM-DD date`);
    }
    const key = `${entry.advisory}|${entry.package}`;
    if (seen.has(key)) throw new Error(`${where}: duplicate exception for ${key}`);
    seen.add(key);
    return entry;
  });
}

function nonBreakingFix(fix) {
  return fix === true || (typeof fix === 'object' && fix !== null && fix.isSemVerMajor === false);
}

function exceptionProblem(exception, advisory, now) {
  if (now.getTime() > expiryEnd(exception.expires)) {
    return `the exception expired on ${exception.expires}; fix the dependency or re-assess and renew it`;
  }
  if (advisory.dependents.length === 0) {
    return 'cannot tell which direct dependency reaches it, so the exception cannot be verified';
  }
  const unexpected = advisory.dependents.filter((name) => !exception.dependents.includes(name));
  if (unexpected.length > 0) {
    return `now also reached through ${unexpected.join(', ')}; the exception only covers ${exception.dependents.join(', ')}`;
  }
  if (nonBreakingFix(advisory.fix)) {
    return 'a non-breaking fix is now available; apply it (npm audit fix) and delete the exception';
  }
  return null;
}

export function evaluateAudit(report, exceptions, { now = new Date(), level = AUDIT_LEVEL } = {}) {
  const threshold = SEVERITY_RANK[level];
  const failures = [];
  const accepted = [];
  const notices = [];
  const used = new Set();

  for (const advisory of collectAdvisories(report)) {
    // An unrecognised severity fails closed.
    if ((SEVERITY_RANK[advisory.severity] ?? SEVERITY_RANK.critical) < threshold) continue;
    const label = `${advisory.id} (${advisory.package}, ${advisory.severity}): ${advisory.title}`;
    const exception = exceptions.find(
      (entry) => entry.advisory === advisory.id && entry.package === advisory.package,
    );
    if (!exception) {
      failures.push(`Unaccepted advisory ${label}`);
      continue;
    }
    used.add(exception);
    const problem = exceptionProblem(exception, advisory, now);
    if (problem) {
      failures.push(`${label} — ${problem}`);
      continue;
    }
    accepted.push(`${label} — accepted until ${exception.expires} (${exception.dependents.join(', ')})`);
    const daysLeft = Math.ceil((expiryEnd(exception.expires) - now.getTime()) / DAY_MS);
    if (daysLeft <= EXPIRY_WARNING_DAYS) {
      notices.push(`The exception for ${advisory.id} expires in ${daysLeft} day(s); plan its removal.`);
    }
  }

  for (const exception of exceptions) {
    if (!used.has(exception)) {
      notices.push(`The exception for ${exception.advisory} (${exception.package}) matches no finding; delete it.`);
    }
  }
  return { failures, accepted, notices };
}

function runNpmAudit() {
  return execFileSync('npm', ['audit', '--omit=dev', '--json'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    // npm is a .cmd shim on Windows, which Node refuses to spawn without a shell.
    // The arguments are constants.
    shell: process.platform === 'win32',
  });
}

// `npm audit` exits non-zero when it finds anything, so the JSON comes from stdout
// either way. An audit that did not run (network, registry) is never a pass.
export function readAuditReport(exec = runNpmAudit) {
  let output;
  try {
    output = exec();
  } catch (error) {
    output = error?.stdout;
    if (typeof output !== 'string' || output.trim() === '') {
      throw new Error(`npm audit produced no output: ${error?.message ?? error}`);
    }
  }
  let report;
  try {
    report = JSON.parse(output);
  } catch {
    throw new Error('npm audit did not return JSON');
  }
  if (report?.error) {
    throw new Error(`npm audit failed: ${report.error.summary ?? report.error.code ?? 'unknown error'}`);
  }
  if (typeof report?.vulnerabilities !== 'object' || report.vulnerabilities === null) {
    throw new Error('npm audit JSON has no "vulnerabilities" field');
  }
  return report;
}

export function runGate({ exec, exceptions, now = new Date(), log = console } = {}) {
  const { failures, accepted, notices } = evaluateAudit(readAuditReport(exec), exceptions, { now });
  for (const line of accepted) log.log(`accepted: ${line}`);
  for (const line of notices) log.log(`notice: ${line}`);
  for (const line of failures) log.error(`FAIL: ${line}`);
  log.log(`Dependency audit (level ${AUDIT_LEVEL}): ${failures.length} failure(s), ${accepted.length} accepted.`);
  return failures.length === 0 ? 0 : 1;
}

export function loadExceptions(url = new URL('./audit-exceptions.json', import.meta.url)) {
  return parseExceptions(JSON.parse(readFileSync(url, 'utf8')));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = runGate({ exceptions: loadExceptions() });
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
