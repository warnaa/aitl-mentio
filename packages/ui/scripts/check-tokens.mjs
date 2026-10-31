import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const palette = "white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const namedColors = "aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkgrey|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkslategrey|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dimgrey|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gray|green|greenyellow|grey|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightgrey|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightslategrey|lightsteelblue|lightyellow|lime|limegreen|linen|magenta|maroon|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|rebeccapurple|red|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategray|slategrey|snow|springgreen|steelblue|tan|teal|thistle|tomato|turquoise|violet|wheat|white|whitesmoke|yellow|yellowgreen";
const colorUtility = new RegExp(`(?<![\\w-])(?:bg|text|border(?:-[trblxyse])?|divide|ring(?:-offset)?|outline|fill|stroke|decoration|accent|caret|shadow|from|via|to|placeholder)-(?:${palette})(?:-(?:50|[1-9]00|950))?(?:\\/[\\d.]+)?(?![\\w-])`, "g");
const sourceExtensions = /\.(?:[cm]?[jt]sx?|css|mdx)$/;
const skippedFiles = /(?:\.test\.[cm]?[jt]sx?$|\.d\.ts$)/;

/** Ignore comments, preserving offsets and line numbers for useful diagnostics. */
function withoutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));
}

/** Return every token-policy violation with stable source coordinates. */
export function inspectSource(source, file) {
  const code = withoutComments(source);
  const findings = [];
  const patterns = [
    ["literal-color", /(?<![\w])#[\da-f]{3,8}(?![\w])/gi],
    ["literal-color", /\b(?:rgba?|hsla?|oklch|oklab|lch|lab|hwb|color)\s*\(/gi],
    ["palette-utility", colorUtility],
    ["arbitrary-value", /\[(?:--)?[a-z][\w-]*:[^\]\r\n]+\]/gi],
    ["arbitrary-value", /(?<![\w-])-?[a-z][\w-]*-\[(?:[^\]\\\r\n]|\\.)+\]/gi],
    ["literal-color", new RegExp(`\\b(?:color|background(?:-?color)?|border(?:-?[\\w-]+)?|fill|stroke|outline(?:-?color)?)\\s*:\\s*["']?(?:${namedColors})(?![\\w-])`, "gi")],
  ];
  for (const [rule, pattern] of patterns) {
    for (const match of code.matchAll(pattern)) {
      // data-[state=open]: and [&>svg]: are selectors, not arbitrary values.
      if (rule === "arbitrary-value" && code[match.index + match[0].length] === ":") continue;
      const preceding = code.slice(0, match.index);
      const line = preceding.split("\n").length;
      const column = match.index - preceding.lastIndexOf("\n");
      findings.push({ file, line, column, rule, value: match[0] });
    }
  }
  return findings.sort((a, b) => a.line - b.line || a.column - b.column);
}

/** Scan actual UI/story sources. The sole literal token source is excluded. */
export async function checkTokens(packageRoot) {
  const findings = [];
  async function visit(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile() && sourceExtensions.test(entry.name) && !skippedFiles.test(entry.name)) {
        const file = relative(packageRoot, path).replaceAll("\\", "/");
        if (file === "src/styles/globals.css") continue;
        findings.push(...inspectSource(await readFile(path, "utf8"), file));
      }
    }
  }
  await visit(join(packageRoot, "src"));
  await visit(join(packageRoot, "storybook"));
  // Manager theme colors belong to the Storybook application, not product tokens.
  // Scan only preview styling; framework configuration and generated MSW are tooling.
  const previewPath = join(packageRoot, ".storybook", "preview.css");
  try {
    findings.push(...inspectSource(await readFile(previewPath, "utf8"), ".storybook/preview.css"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return findings;
}

/** Injectable output makes the same CI command independently testable. */
export async function runCheck(packageRoot, write) {
  const findings = await checkTokens(packageRoot);
  for (const finding of findings) {
    write(`${finding.file}:${finding.line}:${finding.column} ${finding.rule}: ${finding.value}`);
  }
  write(findings.length === 0 ? "Token policy passed." : `Token policy failed: ${findings.length} violation(s).`);
  return findings.length === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = await runCheck(resolve(dirname(fileURLToPath(import.meta.url)), ".."), (line) => process.stdout.write(`${line}\n`));
}
