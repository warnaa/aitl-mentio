// Production-dependency audit gate: fails on any high/critical advisory that is not
// explicitly allowlisted (with a reason) in scripts/audit-allowlist.json.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BLOCKING = new Set(["high", "critical"]);

const advisoryId = (url) => url.split("/").pop();

/** Unique advisories (the object entries in `via`) at blocking severity. */
export function collectAdvisories(report) {
  const byId = new Map();
  for (const vuln of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vuln.via) {
      if (typeof via === "object" && BLOCKING.has(via.severity)) {
        byId.set(advisoryId(via.url), { id: advisoryId(via.url), package: via.name, title: via.title, severity: via.severity });
      }
    }
  }
  return [...byId.values()];
}

/** Splits advisories into blocking ones and allowlist entries that no longer match anything. */
export function checkAudit(report, allowlist) {
  const advisories = collectAdvisories(report);
  const allowed = new Set(allowlist.map((entry) => entry.id));
  const found = new Set(advisories.map((advisory) => advisory.id));
  return {
    blocking: advisories.filter((advisory) => !allowed.has(advisory.id)),
    stale: allowlist.filter((entry) => !found.has(entry.id)),
  };
}

/** Raw `npm audit --json` output for production dependencies. */
export function runNpmAudit(exec = execFileSync) {
  try {
    return exec("npm", ["audit", "--omit=dev", "--json"], { encoding: "utf8" });
  } catch (error) {
    // npm audit exits non-zero when it finds anything; the JSON is still on stdout.
    if (error.stdout) return error.stdout;
    throw error;
  }
}

export function readAllowlist(read = readFileSync) {
  return JSON.parse(read(new URL("./audit-allowlist.json", import.meta.url), "utf8"));
}

/** Runs the gate; returns the process exit code. */
export function main({ auditJson, allowlist, log }) {
  const { blocking, stale } = checkAudit(JSON.parse(auditJson), allowlist);
  for (const entry of stale) {
    log.warn(`audit: allowlisted ${entry.id} (${entry.package}) no longer reported — remove it from scripts/audit-allowlist.json`);
  }
  if (blocking.length > 0) {
    for (const advisory of blocking) {
      log.error(`audit: ${advisory.severity} ${advisory.id} in ${advisory.package}: ${advisory.title}`);
    }
    return 1;
  }
  log.info(`audit: ok (${allowlist.length - stale.length} allowlisted advisory/ies)`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main({
    auditJson: runNpmAudit(),
    allowlist: readAllowlist(),
    log: { info: (line) => process.stdout.write(`${line}\n`), warn: console.warn, error: console.error },
  });
}
