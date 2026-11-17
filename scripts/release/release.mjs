// Pure release decisions for the `Release` workflow (.github/workflows/release.yml):
// which version to publish and which CHANGELOG.md entry becomes the release notes.
// Plain Node ESM with no dependencies; all I/O is injected through `runRelease`.

export const BUMPS = ['patch', 'minor', 'major', 'custom'];

const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/** Parses `MAJOR.MINOR.PATCH` into numbers, or returns null when it is not exactly that. */
export function parseVersion(text) {
  const match = VERSION_PATTERN.exec(text);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** Orders two valid version strings: negative when a < b, 0 when equal, positive when a > b. */
export function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
}

/** Increments a valid version for a `patch`, `minor` or `major` bump. */
export function bumpVersion(current, kind) {
  const [major, minor, patch] = parseVersion(current);
  if (kind === 'major') return `${major + 1}.0.0`;
  if (kind === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function newest(versions) {
  return versions.reduce((best, version) => (compareVersions(version, best) > 0 ? version : best));
}

/**
 * Decides the version to release.
 *
 * The base for a bump is the higher of `package.json` and the newest `vX.Y.Z` tag: the
 * bump reaches `main` through a PR after the release is published, so `package.json`
 * alone can lag behind what was already released.
 *
 * @param {{ bump: string, custom: string, packageVersion: string, tags: string[] }} input
 * @returns {{ version: string, tag: string, tagExists: boolean }}
 */
export function resolveRelease({ bump, custom, packageVersion, tags }) {
  if (!BUMPS.includes(bump)) {
    throw new Error(`Unknown bump ${JSON.stringify(String(bump))}. Choose one of: ${BUMPS.join(', ')}.`);
  }
  if (!parseVersion(packageVersion)) {
    throw new Error(`The root package.json version ${JSON.stringify(packageVersion)} is not MAJOR.MINOR.PATCH.`);
  }
  const tagVersions = tags
    .filter((tag) => tag.startsWith('v'))
    .map((tag) => tag.slice(1))
    .filter((version) => parseVersion(version));
  const requested = custom.trim().replace(/^v/, '');

  if (bump !== 'custom') {
    if (requested) {
      throw new Error(`A custom version was entered but the bump is ${JSON.stringify(bump)}. Choose "custom" to release it.`);
    }
    const version = bumpVersion(newest([packageVersion, ...tagVersions]), bump);
    return { version, tag: `v${version}`, tagExists: false };
  }

  if (!parseVersion(requested)) {
    throw new Error(`Custom version ${JSON.stringify(custom)} is not MAJOR.MINOR.PATCH (for example 1.4.0).`);
  }
  const tagExists = tagVersions.includes(requested);
  if (!tagExists) {
    // Equal to package.json is allowed: it releases the version already checked in.
    const tooLow = compareVersions(requested, packageVersion) < 0
      || (tagVersions.length > 0 && compareVersions(requested, newest(tagVersions)) <= 0);
    if (tooLow) {
      throw new Error(
        `Custom version ${requested} must be greater than the latest released version `
        + `${newest([packageVersion, ...tagVersions])}.`,
      );
    }
  }
  return { version: requested, tag: `v${requested}`, tagExists };
}

/**
 * Removes every `<!-- ... -->` comment, rescanning from the start after each cut so a
 * removal cannot join two fragments into a new `<!--`. An unclosed `<!--` would hide
 * the rest of the published notes, so it fails instead of being guessed at.
 */
function stripHtmlComments(markdown) {
  let text = markdown;
  for (let open = text.indexOf('<!--'); open !== -1; open = text.indexOf('<!--')) {
    const close = text.indexOf('-->', open + 4);
    if (close === -1) {
      throw new Error('CHANGELOG.md has a "<!--" comment that is never closed with "-->". Close or remove it.');
    }
    text = text.slice(0, open) + text.slice(close + 3);
  }
  return text;
}

/**
 * Returns the release notes for `version`: the `# <version> (date)` section of the
 * changelog up to the next level-1 heading, without HTML comments (the changelog
 * generator leaves TODO markers) and without `##` sections that have no content.
 */
export function extractChangelogEntry(markdown, version) {
  const lines = stripHtmlComments(markdown.replace(/^﻿/, '')).split(/\r?\n/);
  // Headings inside a fenced code block (a shell comment such as `# install`) are not headings.
  let open = false;
  const fenced = lines.map((line) => {
    const isFence = /^\s*(```|~~~)/.test(line);
    const inside = open || isFence;
    if (isFence) open = !open;
    return inside;
  });
  const heading = new RegExp(`^#\\s+v?${version.replaceAll('.', '\\.')}(?:\\s.*)?$`);
  const start = lines.findIndex((line, index) => !fenced[index] && heading.test(line));
  if (start === -1) {
    throw new Error(`CHANGELOG.md has no "# ${version}" entry. Add it (om-auto-update-changelog) and merge it first.`);
  }
  const next = lines.findIndex((line, index) => index > start && !fenced[index] && /^#\s/.test(line));
  // Section 0 is the text before the first `##`; every later section starts with its heading.
  const sections = [[]];
  for (let index = start + 1; index < (next === -1 ? lines.length : next); index += 1) {
    if (!fenced[index] && /^##\s/.test(lines[index])) sections.push([]);
    sections.at(-1).push(lines[index]);
  }
  // The changelog skill ends every entry but the oldest with a `---` rule.
  const last = sections.at(-1);
  while (last.length > 0 && /^(\s*|-{3,}\s*)$/.test(last.at(-1))) last.pop();
  const notes = sections
    .filter((section, index) => section.slice(index === 0 ? 0 : 1).join('\n').trim() !== '')
    .map((section) => section.join('\n').trim())
    .join('\n\n');
  if (!notes) {
    throw new Error(`The CHANGELOG.md entry for ${version} has no content.`);
  }
  return `${notes}\n`;
}

/**
 * Resolves the release, writes its notes to `RELEASE_NOTES_FILE` and reports
 * `version`, `tag` and `tag_exists` as workflow outputs. Throws before any side effect
 * other than the notes file when an input or the changelog is wrong.
 *
 * @param {{
 *   env: Record<string, string | undefined>,
 *   readText: (path: string) => string,
 *   writeText: (path: string, text: string) => void,
 *   listTags: () => string[],
 *   appendOutput: (text: string) => void,
 * }} effects
 */
export function runRelease({ env, readText, writeText, listTags, appendOutput }) {
  const notesFile = env.RELEASE_NOTES_FILE;
  if (!notesFile) {
    throw new Error('RELEASE_NOTES_FILE must name the file that receives the release notes.');
  }
  const release = resolveRelease({
    bump: String(env.BUMP),
    custom: env.CUSTOM_VERSION ?? '',
    packageVersion: JSON.parse(readText('package.json')).version,
    tags: listTags(),
  });
  writeText(notesFile, extractChangelogEntry(readText('CHANGELOG.md'), release.version));
  appendOutput(`version=${release.version}\ntag=${release.tag}\ntag_exists=${release.tagExists}`);
  return release;
}
