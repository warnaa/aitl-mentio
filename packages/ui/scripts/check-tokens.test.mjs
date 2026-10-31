import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkTokens, inspectSource, runCheck } from "./check-tokens.mjs";

const roots = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
async function fixture(files) {
  const root = await mkdtemp(join(tmpdir(), "mentio-token-policy-"));
  roots.push(root);
  for (const [file, content] of Object.entries(files)) {
    const path = join(root, file);
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, content);
  }
  return root;
}

describe("token source inspection", () => {
  it("finds all palette utilities, including variants, negative-space boundaries and alpha", () => {
    const violations = inspectSource('className="bg-zinc-900 hover:text-white dark:border-t-red-500/50 ring-offset-black from-violet-400 fill-blue-50"', "card.tsx");
    expect(violations.map(({ value }) => value)).toEqual(["bg-zinc-900", "text-white", "border-t-red-500/50", "ring-offset-black", "from-violet-400", "fill-blue-50"]);
    expect(violations.every(({ rule }) => rule === "palette-utility")).toBe(true);
  });
  it("rejects every literal color form with exact file/line/column coordinates", () => {
    const violations = inspectSource('color: #fff;\n  color: rgb(0 0 0);\ncolor: hsl(0 0% 0%);\nbackground: oklch(0 0 0);\ncolor: red;', "sample.css");
    expect(violations).toEqual([
      { file: "sample.css", line: 1, column: 8, rule: "literal-color", value: "#fff" },
      { file: "sample.css", line: 2, column: 10, rule: "literal-color", value: "rgb(" },
      { file: "sample.css", line: 3, column: 8, rule: "literal-color", value: "hsl(" },
      { file: "sample.css", line: 4, column: 13, rule: "literal-color", value: "oklch(" },
      { file: "sample.css", line: 5, column: 1, rule: "literal-color", value: "color: red" },
    ]);
    expect(inspectSource('backgroundColor: "white"', "inline.tsx")).toHaveLength(1);
    expect(inspectSource("color: rebeccapurple; border-color: tomato; fill: aliceblue; background: whitesmoke;", "named.css")).toHaveLength(4);
  });
  it("rejects arbitrary values while allowing data/ARIA and arbitrary selector variants", () => {
    const violations = inspectSource('p-[13px] -translate-y-[2px] [&>svg]:size-4 data-[state=open]:bg-background aria-[invalid=true]:border-destructive [&>svg]:w-[21px] [padding:13px] [--space:12px]', "bad.tsx");
    expect(violations.map(({ value }) => value)).toEqual(["p-[13px]", "-translate-y-[2px]", "w-[21px]", "[padding:13px]", "[--space:12px]"]);
  });
  it("accepts semantic tokens, structural utilities, custom property shorthand, prose and headings", () => {
    expect(inspectSource('# Color\nMentor #19.\nclassName="bg-background text-foreground border-border flex gap-within-group w-(--content-max-width)"\ncolor: var(--foreground); background: transparent; color: color-mix(in srgb, var(--primary) 90%, transparent);', "foundations.mdx")).toEqual([]);
  });
  it("ignores block comments without changing the next diagnostic's line/column", () => {
    expect(inspectSource('/* #fff\n p-[2px] */\n  text-black', "button.tsx")).toEqual([
      { file: "button.tsx", line: 3, column: 3, rule: "palette-utility", value: "text-black" },
    ]);
  });
  it("does not partially recognize invalid hex words or semantic names", () => {
    expect(inspectSource('#ffffffg bg-neutral-surface text-redemption border-primary shadow-sm', "good.tsx")).toEqual([]);
  });
  it("reports two policies at one position in stable order", () => {
    expect(inspectSource('w-[rgb(0,0,0)]', "bad.tsx").map(({ rule }) => rule)).toEqual(["arbitrary-value", "literal-color"]);
  });
});

describe("filesystem and command", () => {
  it("scans nested product and documentation sources but allows only the literal token entry", async () => {
    const root = await fixture({
      "src/styles/globals.css": "--primary: #fff;",
      "src/nested/component.tsx": 'className="text-white"',
      "src/nested/component.test.tsx": "#fff",
      "src/types.d.ts": "#fff",
      "src/readme.md": "#fff",
      "storybook/color.mdx": '<div className="p-[13px]" />',
      ".storybook/preview.css": ".demo { color: #123456; }",
      ".storybook/manager.ts": "#fff",
      ".storybook/public/mockServiceWorker.js": "#fff",
    });
    await symlink(join(root, "src/nested/component.tsx"), join(root, "src/ignored-link.tsx"));
    expect((await checkTokens(root)).map(({ file }) => file)).toEqual([
      "src/nested/component.tsx", "storybook/color.mdx", ".storybook/preview.css",
    ]);
  });
  it("accepts absent optional source directories and prints success", async () => {
    const root = await fixture({});
    const output = [];
    expect(await runCheck(root, (line) => output.push(line))).toBe(0);
    expect(output).toEqual(["Token policy passed."]);
  });
  it("prints all findings and fails with an actionable summary", async () => {
    const root = await fixture({ "src/bad.tsx": 'text-white\nbg-black' });
    const output = [];
    expect(await runCheck(root, (line) => output.push(line))).toBe(1);
    expect(output).toEqual([
      "src/bad.tsx:1:1 palette-utility: text-white",
      "src/bad.tsx:2:1 palette-utility: bg-black",
      "Token policy failed: 2 violation(s).",
    ]);
  });
  it("propagates unreadable source-directory and preview errors instead of claiming success", async () => {
    const root = await fixture({ src: "not a directory" });
    await expect(checkTokens(root)).rejects.toMatchObject({ code: "ENOTDIR" });
    const other = await fixture({});
    await mkdir(join(other, ".storybook/preview.css"), { recursive: true });
    await expect(checkTokens(other)).rejects.toMatchObject({ code: "EISDIR" });
  });
  it("executes the command entrypoint on direct invocation", async () => {
    const originalArgv = process.argv;
    const originalExitCode = process.exitCode;
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    try {
      process.argv = [process.execPath, new URL("./check-tokens.mjs", import.meta.url).pathname];
      vi.resetModules();
      await import("./check-tokens.mjs");
      expect(process.exitCode).toBe((await checkTokens(new URL("../", import.meta.url).pathname)).length ? 1 : 0);
      expect(write).toHaveBeenCalledWith(expect.stringContaining("Token policy "));
      process.argv = [process.execPath];
      vi.resetModules();
      await import("./check-tokens.mjs");
    } finally {
      process.argv = originalArgv;
      process.exitCode = originalExitCode;
      write.mockRestore();
    }
  });
  it("the real CLI exits nonzero and prints source coordinates for an invalid fixture", async () => {
    const root = await fixture({ "src/bad.tsx": "text-white", "scripts/check-tokens.mjs": await readFile(new URL("./check-tokens.mjs", import.meta.url), "utf8") });
    try {
      execFileSync(process.execPath, [join(root, "scripts/check-tokens.mjs")], { encoding: "utf8" });
      throw new Error("Expected CLI failure for invalid fixture");
    } catch (error) {
      expect(error.status).toBe(1);
      expect(error.stdout).toContain("src/bad.tsx:1:1");
      expect(error.stdout).toContain("Token policy failed:");
    }
  });
});
