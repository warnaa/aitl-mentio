import { describe, expect, it } from "vitest";
import { checkAudit } from "./audit.mjs";

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

  it("reports allowlist entries that no longer match", () => {
    expect(checkAudit(report(), allowlist).stale).toEqual(allowlist);
  });
});
