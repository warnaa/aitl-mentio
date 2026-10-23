import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { checkAudit, main, readAllowlist, runNpmAudit } from "./audit.mjs";

vi.mock("node:child_process", () => ({ execFileSync: vi.fn(() => JSON.stringify({ vulnerabilities: {} })) }));

const advisory = (name, id, severity) => ({
  name,
  title: `${name} issue`,
  url: `https://github.com/advisories/${id}`,
  severity,
});

const report = (...advisories) => ({
  vulnerabilities: Object.fromEntries([
    ...advisories.map((a) => [a.name, { name: a.name, severity: a.severity, via: [a] }]),
    // Transitive entries reference other packages by name only.
    ["awilix", { name: "awilix", severity: "high", via: ["fast-glob"] }],
  ]),
});

const allowlist = [{ id: "GHSA-allowed", package: "braces", reason: "test" }];

describe("checkAudit", () => {
  it("passes when every high/critical advisory is allowlisted", () => {
    expect(checkAudit(report(advisory("braces", "GHSA-allowed", "high")), allowlist)).toEqual({ blocking: [], stale: [] });
  });

  it("blocks a new high or critical advisory", () => {
    const { blocking } = checkAudit(
      report(advisory("braces", "GHSA-allowed", "high"), advisory("foo", "GHSA-new", "high"), advisory("bar", "GHSA-crit", "critical")),
      allowlist,
    );
    expect(blocking.map((a) => a.id)).toEqual(["GHSA-new", "GHSA-crit"]);
  });

  it("ignores moderate and low advisories", () => {
    const { blocking } = checkAudit(report(advisory("foo", "GHSA-mod", "moderate"), advisory("bar", "GHSA-low", "low")), []);
    expect(blocking).toEqual([]);
  });

  it("treats a report without vulnerabilities as clean", () => {
    expect(checkAudit({ auditReportVersion: 2 }, [])).toEqual({ blocking: [], stale: [] });
  });

  it("reports allowlist entries that no longer match", () => {
    expect(checkAudit(report(), allowlist).stale).toEqual(allowlist);
  });
});

const log = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

describe("main", () => {
  it("passes and reports how many advisories were allowlisted", () => {
    const out = log();
    expect(main({ auditJson: JSON.stringify(report(advisory("braces", "GHSA-allowed", "high"))), allowlist, log: out })).toBe(0);
    expect(out.info).toHaveBeenCalledWith("audit: ok (1 allowlisted advisory/ies)");
    expect(out.warn).not.toHaveBeenCalled();
  });

  it("fails with one line per blocking advisory", () => {
    const out = log();
    expect(main({ auditJson: JSON.stringify(report(advisory("foo", "GHSA-new", "critical"))), allowlist, log: out })).toBe(1);
    expect(out.error).toHaveBeenCalledWith("audit: critical GHSA-new in foo: foo issue");
    expect(out.info).not.toHaveBeenCalled();
  });

  it("warns about stale allowlist entries", () => {
    const out = log();
    expect(main({ auditJson: JSON.stringify(report()), allowlist, log: out })).toBe(0);
    expect(out.warn).toHaveBeenCalledWith(expect.stringContaining("GHSA-allowed (braces) no longer reported"));
    expect(out.info).toHaveBeenCalledWith("audit: ok (0 allowlisted advisory/ies)");
  });
});

describe("runNpmAudit", () => {
  it("audits production dependencies as JSON", () => {
    const exec = vi.fn(() => "{}");
    expect(runNpmAudit(exec)).toBe("{}");
    expect(exec).toHaveBeenCalledWith("npm", ["audit", "--omit=dev", "--json"], { encoding: "utf8" });
  });

  it("returns stdout when npm audit exits non-zero because it found advisories", () => {
    const exec = vi.fn(() => {
      throw Object.assign(new Error("exit 1"), { stdout: '{"vulnerabilities":{}}' });
    });
    expect(runNpmAudit(exec)).toBe('{"vulnerabilities":{}}');
  });

  it("rethrows when npm itself fails", () => {
    const exec = vi.fn(() => {
      throw new Error("npm not found");
    });
    expect(() => runNpmAudit(exec)).toThrow("npm not found");
  });
});

describe("readAllowlist", () => {
  it("parses scripts/audit-allowlist.json", () => {
    const read = vi.fn(() => '[{"id":"GHSA-x"}]');
    expect(readAllowlist(read)).toEqual([{ id: "GHSA-x" }]);
    expect(String(read.mock.calls[0][0])).toMatch(/scripts\/audit-allowlist\.json$/);
  });

  it("every real entry documents why it is accepted", () => {
    for (const entry of readAllowlist()) {
      expect(entry).toMatchObject({ id: expect.stringMatching(/^GHSA-/), package: expect.any(String), reason: expect.any(String) });
    }
  });
});

describe("CLI entry", () => {
  it("runs the gate and sets the exit code when executed directly", async () => {
    vi.resetModules();
    vi.spyOn(process.stdout, "write").mockReturnValue(true);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const argv = process.argv;
    process.argv = [argv[0], fileURLToPath(new URL("./audit.mjs", import.meta.url))];
    try {
      await import("./audit.mjs");
      expect(process.exitCode).toBe(0);
      expect(process.stdout.write).toHaveBeenCalledWith(expect.stringMatching(/^audit: ok/));
    } finally {
      process.argv = argv;
      process.exitCode = undefined;
    }
  });
});
