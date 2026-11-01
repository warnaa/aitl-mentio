import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { END, START, componentTable, runAgentDoc, syncComponents } from "./agent-doc.mjs";

const entries = [{ name: "Button", importLine: "import { Button } from '@mentio/ui/components/button';", when: "Save | pay", whenNot: "Navigation (Link)." }];
const dirs = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))); });
async function doc(content) {
  const dir = await mkdtemp(join(tmpdir(), "agent-doc-"));
  dirs.push(dir);
  const path = join(dir, "design-system.md");
  await writeFile(path, content);
  return path;
}

describe("agent reference", () => {
  it("renders one table row per component, escaping pipes", () => {
    expect(componentTable(entries).split("\n")).toEqual([
      "| Component | Import | Use when | Do not use when |",
      "|---|---|---|---|",
      "| Button | `import { Button } from '@mentio/ui/components/button';` | Save \\| pay | Navigation (Link). |",
    ]);
  });

  it("replaces only the block between the markers", () => {
    const synced = syncComponents(`# Title\n${START}\nold\n${END}\nAfter`, entries);
    expect(synced).toBe(`# Title\n${START}\n${componentTable(entries)}\n${END}\nAfter`);
  });

  it("refuses a document without markers or with them out of order", () => {
    expect(() => syncComponents("# No markers", entries)).toThrow(/markers are missing/);
    expect(() => syncComponents(`${END}\n${START}`, entries)).toThrow(/markers are missing/);
  });

  it("writes the table, then reports it up to date; a stale file fails the check", async () => {
    const path = await doc(`${START}\nold\n${END}\n`);
    const lines = [];
    const write = (line) => lines.push(line);
    expect(await runAgentDoc({ docPath: path, entries, check: true, write })).toBe(1);
    expect(await runAgentDoc({ docPath: path, entries, check: false, write })).toBe(0);
    expect(await runAgentDoc({ docPath: path, entries, check: true, write })).toBe(0);
    expect(lines).toEqual(["Agent reference is stale: run npm run docs:agent.", "Agent reference updated.", "Agent reference is up to date."]);
    expect(await readFile(path, "utf8")).toContain("| Button |");
  });

  it("executes the command entrypoint on direct invocation and finds the repository file in sync", async () => {
    const argv = process.argv;
    const exitCode = process.exitCode;
    try {
      process.argv = [process.execPath, new URL("./agent-doc.mjs", import.meta.url).pathname, "--check"];
      await import("./agent-doc.mjs?entry");
      expect(process.exitCode).toBe(0);
    } finally {
      process.argv = argv;
      process.exitCode = exitCode;
    }
  });
});
