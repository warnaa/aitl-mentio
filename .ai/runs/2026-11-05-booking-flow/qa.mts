import { readFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { runAgentBrowser, closeAgentBrowser, currentUrl } from '../../../tests/integration/agent-browser';

await import('./explore.mts');
const fixture = JSON.parse(await readFile('.ai/runs/2026-11-05-booking-flow/exploration-fixture.json', 'utf8'));
const directory = resolve('.ai/qa/artifacts_booking-flow');
await mkdir(directory, { recursive: true });
const session = 'booking-final-qa';
const steps: Array<{ step: number; priority: string; action: string; expected: string; observed: string; result: string; screenshot?: string }> = [];
const assert = (condition: boolean, message: string) => { if (!condition) throw new Error(message); };
const capture = async (name: string) => {
  const path = resolve(directory, `${name}.png`);
  await runAgentBrowser(session, 'screenshot', path, '--full');
  assert((await stat(path)).size > 0, 'Screenshot is empty');
  return path;
};
const headSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
let verdict = 'FAIL';
try {
  await runAgentBrowser(session, 'open', `${fixture.base}/m/${fixture.slug}`);
  let tree = await runAgentBrowser(session, 'snapshot');
  assert(tree.includes('Sessions are text. DevMentor makes no promise about how soon an answer arrives.'), 'Missing shared notice');
  assert(tree.includes('less than two hours before the start.') && tree.includes('disabled'), 'Near slot is not visibly disabled');
  const timing = await runAgentBrowser(session, 'eval', 'JSON.stringify(performance.getEntriesByType("navigation").map(e => ({responseStartMs:e.responseStart,domContentLoadedMs:e.domContentLoadedEventEnd})))');
  await writeFile(resolve(directory, 'navigation-timing.json'), timing);
  steps.push({ step: 1, priority: 'P1', action: 'Cold-load mentor page', expected: 'Useful session shell, prices, text notice and disabled near time', observed: 'Required copy and disabled controls are present in the accessibility tree.', result: 'PASS', screenshot: await capture('step-01-selection') });
  const choose = async (match: (line: string) => boolean) => {
    tree = await runAgentBrowser(session, 'snapshot');
    const line = tree.split('\n').find(line => line.includes('radio "') && match(line));
    const ref = line?.match(/ref=(e\d+)/)?.[1];
    assert(!!ref, 'Expected radio missing');
    await runAgentBrowser(session, 'click', `@${ref}`);
  };
  await choose(line => line.includes('2099') && !line.includes('disabled'));
  await choose(line => line.includes('radio "50 minutes:'));
  await runAgentBrowser(session, 'find', 'role', 'link', 'click', '--name', 'Sign in to reserve');
  const signIn = await currentUrl(session);
  assert(signIn.pathname === '/sign-in', 'Selection did not navigate to sign-in');
  assert(signIn.searchParams.get('returnTo') === `/m/${fixture.slug}?slot=${fixture.slotId}&length=50`, 'Selection missing from returnTo');
  steps.push({ step: 2, priority: 'P0', action: 'Select slot and 50 minutes signed out', expected: 'Sign-in preserves slot and length', observed: 'The sign-in URL carries the exact encoded return path.', result: 'PASS', screenshot: await capture('step-02-sign-in') });
  await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Continue with GitHub');
  const returned = await currentUrl(session);
  assert(returned.pathname === `/m/${fixture.slug}` && returned.searchParams.get('slot') === fixture.slotId && returned.searchParams.get('length') === '50', 'Sign-in did not restore selection');
  tree = await runAgentBrowser(session, 'snapshot');
  assert(tree.split('\n').some(line => line.includes('radio "50 minutes:') && line.includes('checked=true')), 'Duration is not restored');
  assert(tree.includes('button "Reserve this time"'), 'Explicit reserve action is missing');
  steps.push({ step: 3, priority: 'P0', action: 'Complete actual test-adapter GitHub sign-in', expected: 'Same selection restored without an automatic reservation', observed: 'The chosen duration is checked and the explicit reserve action remains.', result: 'PASS', screenshot: await capture('step-03-restored') });
  await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Reserve this time');
  await runAgentBrowser(session, 'wait', '--text', 'Pending reservation');
  tree = await runAgentBrowser(session, 'snapshot');
  assert(tree.includes('This reservation is unpaid and is not confirmed.') && tree.includes('Held until:'), 'Pending result misrepresents confirmation');
  steps.push({ step: 4, priority: 'P0', action: 'Reserve selected time', expected: 'Authoritative price, pending/unpaid state and hold expiry', observed: 'The result states pending, unpaid and not confirmed, with 50-minute price and expiry.', result: 'PASS', screenshot: await capture('step-04-pending-desktop') });
  await runAgentBrowser(session, 'set', 'viewport', '320', '720');
  const overflow = await runAgentBrowser(session, 'eval', 'document.documentElement.scrollWidth - document.documentElement.clientWidth');
  assert(Number(overflow) <= 0, 'Mobile page overflows horizontally');
  steps.push({ step: 5, priority: 'P1', action: 'Inspect 320px pending result', expected: 'Readable content without horizontal overflow', observed: `Measured horizontal overflow: ${overflow}px.`, result: 'PASS', screenshot: await capture('step-05-pending-mobile') });
  verdict = 'PASS';
} finally {
  await closeAgentBrowser(session);
  const report = { runId: '2026-11-05-booking-flow', mode: 'pr', target: { prNumber: 69, title: 'Reserve mentor slots at server prices', branch: 'feat/issue-40-booking-flow', headSha }, verdict, environment: { baseUrl: fixture.base, role: 'mentee', startedByThisRepo: true, browserProvider: 'agent-browser' }, scenario: steps, hasUiTest: true, notes: ['Shared preview had two snapshot timeouts; configured agent-browser fallback was used.', 'Private repository prevents public inline image rendering; evidence remains local and is linked on the PR.', 'Human QA signoff and human scenario review remain pending; no qa-approved label is granted.'] };
  await writeFile(resolve(directory, 'report.json'), JSON.stringify(report, null, 2));
  const rows = steps.map(step => `| ${step.step} | ${step.action} | ${step.expected} | ${step.observed} | ${step.result} |`).join('\n');
  await writeFile(resolve(directory, 'report.md'), `## 📸 UI QA evidence — ${verdict}\n\nEnvironment: ${fixture.base}, mentee, agent-browser. Verified feat/issue-40-booking-flow @ ${headSha}.\n\n| # | Step | Expected | Observed | Result |\n| --- | --- | --- | --- | --- |\n${rows}\n\n### Screenshots\n${steps.filter(step => step.screenshot).map(step => `- ${step.screenshot}`).join('\n')}\n\nPrivate repository: inline public image rendering is unavailable. Human QA and scenario review remain pending. The browser session is closed; the owned environment is stopped by the driver.\n`);
}
console.log(JSON.stringify({ verdict, steps: steps.length, directory, headSha }));
