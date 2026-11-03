import { expect } from 'vitest';

/** What must not appear: an element role, an accessible name or text, or both. */
export interface AbsentQuery {
  /** An ARIA role as agent-browser prints it, e.g. `link`, `button`, `searchbox`. */
  role?: string;
  /** Matched against the element's accessible name; a string matches as a substring. */
  text?: string | RegExp;
}

/** One element line of an agent-browser accessibility snapshot. */
interface SnapshotNode {
  role: string;
  name: string | undefined;
  line: string;
}

// `- link "Users" [ref=e6]`, `- StaticText "Signed in as"`, `- main`, `- textbox "Email" [disabled]`
const NODE_LINE = /^\s*- ([A-Za-z]+)(?: "((?:[^"\\]|\\.)*)")?/;

function nodesOf(snapshot: string): SnapshotNode[] {
  return snapshot.split('\n').flatMap((line) => {
    const match = NODE_LINE.exec(line);
    return match ? [{ role: match[1]!, name: match[2], line: line.trim() }] : [];
  });
}

function nameMatches(name: string | undefined, text: string | RegExp): boolean {
  if (name === undefined) return false;
  return typeof text === 'string' ? name.includes(text) : text.test(name);
}

/**
 * Assert the accessibility snapshot contains **no** element matching `query`
 * (primitives spec F7). A prohibition — no "become a mentor" link, no searchbox, no
 * video control — reads as one call instead of a `.not.toMatch` over raw text.
 *
 * It matches parsed snapshot lines, so `{ role: 'link', text: /mentor/i }` does not
 * trip over a heading or a paragraph that merely mentions mentors. Asserting absence
 * against an empty tree passes for the wrong reason: assert first that the region you
 * are inspecting rendered (see `roles.integration.test.ts`).
 *
 * @throws when `query` names neither a role nor a text, which would assert nothing.
 */
export function expectAbsent(snapshot: string, query: AbsentQuery): void {
  if (query.role === undefined && query.text === undefined) {
    throw new Error('expectAbsent needs a role, a text, or both');
  }
  const found = nodesOf(snapshot).filter(
    (node) =>
      (query.role === undefined || node.role === query.role) &&
      (query.text === undefined || nameMatches(node.name, query.text)),
  );
  expect(
    found.map((node) => node.line),
    `expected no ${query.role ?? 'element'}${query.text === undefined ? '' : ` matching ${String(query.text)}`}`,
  ).toEqual([]);
}
