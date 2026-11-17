import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  collectAdvisories, evaluateAudit, loadExceptions, parseExceptions, readAuditReport, runGate,
} from './audit-gate.mjs';

// Trimmed from the real `npm audit --omit=dev --json` output that failed CI on 2026-11-17.
const PICOMATCH_ADVISORY = {
  source: 1247710,
  name: 'picomatch',
  dependency: 'picomatch',
  title: 'picomatch vulnerable to ReDoS through single-branch repeated extglobs',
  url: 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf',
  severity: 'high',
  range: '<=4.0.7',
};
const MAJOR_FIX = { name: 'awilix', version: '6.0.0', isSemVerMajor: true };

function realReport() {
  return {
    vulnerabilities: {
      awilix: { name: 'awilix', severity: 'high', isDirect: true, via: ['fast-glob'], effects: [], fixAvailable: MAJOR_FIX },
      'fast-glob': { name: 'fast-glob', severity: 'high', isDirect: false, via: ['micromatch'], effects: ['awilix'], fixAvailable: MAJOR_FIX },
      micromatch: { name: 'micromatch', severity: 'high', isDirect: false, via: ['picomatch'], effects: ['fast-glob'], fixAvailable: MAJOR_FIX },
      picomatch: { name: 'picomatch', severity: 'high', isDirect: false, via: [PICOMATCH_ADVISORY], effects: ['micromatch'], fixAvailable: MAJOR_FIX },
    },
  };
}

function exception(overrides = {}) {
  return {
    advisory: 'ghsa-fc5q-39xc-vjpf',
    package: 'picomatch',
    dependents: ['awilix'],
    expires: '2027-02-15',
    reason: 'unreachable',
    ...overrides,
  };
}

const NOW = new Date('2026-11-17T12:00:00Z');

test('the real report is collected as one advisory reached only through awilix', () => {
  assert.deepEqual(collectAdvisories(realReport()), [{
    id: 'ghsa-fc5q-39xc-vjpf',
    package: 'picomatch',
    severity: 'high',
    title: PICOMATCH_ADVISORY.title,
    dependents: ['awilix'],
    fix: MAJOR_FIX,
  }]);
});

test('an advisory without a GHSA url falls back to its npm source id, and a missing title and name are tolerated', () => {
  const report = { vulnerabilities: { left: { isDirect: true, via: [{ source: 7, severity: 'high' }] } } };
  assert.deepEqual(collectAdvisories(report), [{
    id: 'npm:7', package: 'left', severity: 'high', title: 'no title', dependents: ['left'], fix: false,
  }]);
  assert.deepEqual(collectAdvisories({}), []);
  assert.deepEqual(collectAdvisories({ vulnerabilities: { odd: { via: [] } } }), []);
});

test('the listed advisory passes and is reported as accepted', () => {
  const result = evaluateAudit(realReport(), [exception()], { now: NOW });
  assert.deepEqual(result.failures, []);
  assert.equal(result.accepted.length, 1);
  assert.match(result.accepted[0], /ghsa-fc5q-39xc-vjpf .*accepted until 2027-02-15 \(awilix\)/);
  assert.deepEqual(result.notices, []);
});

test('without an exception the same finding fails and names the advisory', () => {
  const { failures } = evaluateAudit(realReport(), [], { now: NOW });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /Unaccepted advisory ghsa-fc5q-39xc-vjpf \(picomatch, high\)/);
});

test('an exception for another advisory or package does not cover the finding', () => {
  for (const other of [{ advisory: 'ghsa-aaaa-bbbb-cccc' }, { package: 'micromatch' }]) {
    const { failures } = evaluateAudit(realReport(), [exception(other)], { now: NOW });
    assert.equal(failures.length, 1, JSON.stringify(other));
  }
});

test('a different high or critical advisory still fails while the listed one is accepted', () => {
  const report = realReport();
  report.vulnerabilities.lodash = {
    name: 'lodash', severity: 'critical', isDirect: true, effects: [],
    via: [{ source: 1, name: 'lodash', title: 'Prototype pollution', url: 'https://github.com/advisories/GHSA-1111-2222-3333', severity: 'critical' }],
  };
  const result = evaluateAudit(report, [exception()], { now: NOW });
  assert.equal(result.accepted.length, 1);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0], /Unaccepted advisory ghsa-1111-2222-3333 \(lodash, critical\)/);
});

test('advisories below the audit level are ignored, and an unknown severity fails closed', () => {
  const report = { vulnerabilities: {
    a: { isDirect: true, via: [{ source: 1, name: 'a', url: 'https://github.com/advisories/GHSA-aaaa-aaaa-aaaa', severity: 'moderate' }] },
    b: { isDirect: true, via: [{ source: 2, name: 'b', url: 'https://github.com/advisories/GHSA-bbbb-bbbb-bbbb', severity: 'low' }] },
    c: { isDirect: true, via: [{ source: 3, name: 'c', url: 'https://github.com/advisories/GHSA-cccc-cccc-cccc', severity: 'mystery' }] },
  } };
  const { failures } = evaluateAudit(report, [], { now: NOW });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /ghsa-cccc-cccc-cccc/);
});

test('a new direct dependent reaching the advisory voids the exception', () => {
  const report = realReport();
  report.vulnerabilities.picomatch.effects.push('next');
  report.vulnerabilities.next = { name: 'next', isDirect: true, via: ['picomatch'], effects: [] };
  const { failures, accepted } = evaluateAudit(report, [exception()], { now: NOW });
  assert.deepEqual(accepted, []);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /now also reached through next; the exception only covers awilix/);
});

test('the advisory package becoming a direct dependency voids the exception', () => {
  const report = realReport();
  report.vulnerabilities.picomatch.isDirect = true;
  const { failures } = evaluateAudit(report, [exception()], { now: NOW });
  assert.match(failures[0], /also reached through picomatch/);
});

test('an advisory whose direct dependent cannot be determined cannot be accepted', () => {
  const report = { vulnerabilities: { picomatch: { name: 'picomatch', isDirect: false, via: [PICOMATCH_ADVISORY], effects: ['ghost'] } } };
  const { failures } = evaluateAudit(report, [exception()], { now: NOW });
  assert.match(failures[0], /cannot tell which direct dependency reaches it/);
});

test('the exception is valid through its expiry day and fails the day after', () => {
  const lastDay = evaluateAudit(realReport(), [exception()], { now: new Date('2027-02-15T23:59:00Z') });
  assert.deepEqual(lastDay.failures, []);
  assert.match(lastDay.notices[0], /expires in 1 day\(s\)/);
  const expired = evaluateAudit(realReport(), [exception()], { now: new Date('2027-02-16T00:00:01Z') });
  assert.equal(expired.failures.length, 1);
  assert.match(expired.failures[0], /the exception expired on 2027-02-15/);
});

test('an upcoming expiry is announced two weeks ahead but not earlier', () => {
  const soon = evaluateAudit(realReport(), [exception()], { now: new Date('2027-02-02T12:00:00Z') });
  assert.match(soon.notices[0], /expires in 14 day\(s\)/);
  const early = evaluateAudit(realReport(), [exception()], { now: new Date('2027-02-01T12:00:00Z') });
  assert.deepEqual(early.notices, []);
});

test('a non-breaking fix makes the exception fail so it gets removed', () => {
  for (const fix of [true, { name: 'picomatch', version: '4.0.8', isSemVerMajor: false }]) {
    const report = realReport();
    report.vulnerabilities.picomatch.fixAvailable = fix;
    const { failures } = evaluateAudit(report, [exception()], { now: NOW });
    assert.match(failures[0], /a non-breaking fix is now available/, JSON.stringify(fix));
  }
  for (const fix of [false, MAJOR_FIX]) {
    const report = realReport();
    report.vulnerabilities.picomatch.fixAvailable = fix;
    assert.deepEqual(evaluateAudit(report, [exception()], { now: NOW }).failures, []);
  }
});

test('an exception that matches nothing is flagged for deletion without failing', () => {
  const result = evaluateAudit({ vulnerabilities: {} }, [exception()], { now: NOW });
  assert.deepEqual(result.failures, []);
  assert.match(result.notices[0], /matches no finding; delete it/);
});

test('exceptions are validated strictly', () => {
  assert.throws(() => parseExceptions(undefined), /"exceptions" array/);
  assert.throws(() => parseExceptions({ exceptions: [exception({ advisory: 'GHSA-fc5q-39xc-vjpf' })] }), /lowercase GHSA id/);
  assert.throws(() => parseExceptions({ exceptions: [null] }), /lowercase GHSA id/);
  assert.throws(() => parseExceptions({ exceptions: [exception({ package: '' })] }), /"package"/);
  assert.throws(() => parseExceptions({ exceptions: [exception({ reason: ' ' })] }), /"reason"/);
  assert.throws(() => parseExceptions({ exceptions: [exception({ dependents: [] })] }), /"dependents"/);
  assert.throws(() => parseExceptions({ exceptions: [exception({ dependents: [''] })] }), /"dependents"/);
  assert.throws(() => parseExceptions({ exceptions: [exception({ expires: '2027-2-15' })] }), /"expires"/);
  assert.throws(() => parseExceptions({ exceptions: [exception({ expires: '2027-13-45' })] }), /"expires"/);
  assert.throws(() => parseExceptions({ exceptions: [exception({ expires: '2027-02-30' })] }), /"expires"/);
  assert.throws(() => parseExceptions({ exceptions: [exception({ expires: '2027-04-31' })] }), /"expires"/);
  assert.throws(() => parseExceptions({ exceptions: [exception({ expires: undefined })] }), /"expires"/);
  assert.throws(() => parseExceptions({ exceptions: [exception(), exception()] }), /duplicate exception/);
  assert.deepEqual(parseExceptions({ exceptions: [] }), []);
});

test('the committed exceptions file is valid and covers only the picomatch advisory through awilix', () => {
  const exceptions = loadExceptions();
  assert.equal(exceptions.length, 1);
  assert.equal(exceptions[0].advisory, 'ghsa-fc5q-39xc-vjpf');
  assert.equal(exceptions[0].package, 'picomatch');
  assert.deepEqual(exceptions[0].dependents, ['awilix']);
  assert.deepEqual(evaluateAudit(realReport(), exceptions, { now: NOW }).failures, []);
});

test('npm audit output is read from stdout even when it exits non-zero', () => {
  const failing = Object.assign(new Error('exit 1'), { stdout: JSON.stringify(realReport()) });
  assert.deepEqual(readAuditReport(() => { throw failing; }), realReport());
  assert.deepEqual(readAuditReport(() => JSON.stringify({ vulnerabilities: {} })), { vulnerabilities: {} });
});

test('an audit that did not run is an error and never a pass', () => {
  const noOutput = (stdout) => () => { throw Object.assign(new Error('spawn failed'), { stdout }); };
  assert.throws(() => readAuditReport(noOutput('')), /npm audit produced no output: spawn failed/);
  assert.throws(() => readAuditReport(noOutput(undefined)), /produced no output/);
  assert.throws(() => readAuditReport(() => { throw undefined; }), /produced no output/);
  assert.throws(() => readAuditReport(() => 'not json'), /did not return JSON/);
  assert.throws(
    () => readAuditReport(() => JSON.stringify({ error: { code: 'ENOTFOUND', summary: 'registry unreachable' } })),
    /npm audit failed: registry unreachable/,
  );
  assert.throws(() => readAuditReport(() => JSON.stringify({ error: { code: 'ENOTFOUND' } })), /ENOTFOUND/);
  assert.throws(() => readAuditReport(() => JSON.stringify({ error: {} })), /unknown error/);
  assert.throws(() => readAuditReport(() => JSON.stringify({})), /no "vulnerabilities" field/);
  assert.throws(() => readAuditReport(() => 'null'), /no "vulnerabilities" field/);
});

function capture() {
  const lines = [];
  return { lines, log: { log: (line) => lines.push(line), error: (line) => lines.push(line) } };
}

test('the gate exits 0 with the accepted advisory and prints what it accepted', () => {
  const { lines, log } = capture();
  const code = runGate({ exec: () => JSON.stringify(realReport()), exceptions: [exception()], now: NOW, log });
  assert.equal(code, 0);
  assert.match(lines.join('\n'), /accepted: .*ghsa-fc5q-39xc-vjpf/);
  assert.match(lines.join('\n'), /0 failure\(s\), 1 accepted/);
});

test('the gate exits 1 for an unaccepted finding and prints it', () => {
  const { lines, log } = capture();
  const code = runGate({ exec: () => JSON.stringify(realReport()), exceptions: [], now: NOW, log });
  assert.equal(code, 1);
  assert.match(lines.join('\n'), /FAIL: Unaccepted advisory ghsa-fc5q-39xc-vjpf/);
});

test('the gate prints notices and defaults its clock and logger', () => {
  const { lines, log } = capture();
  runGate({ exec: () => JSON.stringify({ vulnerabilities: {} }), exceptions: [exception()], now: NOW, log });
  assert.match(lines.join('\n'), /notice: .*matches no finding/);
  const original = { log: console.log, error: console.error };
  console.log = () => {};
  console.error = () => {};
  try {
    assert.equal(runGate({ exec: () => JSON.stringify({ vulnerabilities: {} }), exceptions: [] }), 0);
  } finally {
    Object.assign(console, original);
  }
});
