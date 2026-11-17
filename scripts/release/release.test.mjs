import { describe, expect, it, vi } from 'vitest';
import {
  BUMPS,
  bumpVersion,
  compareVersions,
  extractChangelogEntry,
  parseVersion,
  resolveRelease,
  runRelease,
} from './release.mjs';

describe('parseVersion', () => {
  it('reads MAJOR.MINOR.PATCH', () => {
    expect(parseVersion('1.20.3')).toEqual([1, 20, 3]);
    expect(parseVersion('0.0.0')).toEqual([0, 0, 0]);
  });

  it.each(['', '1.2', '1.2.3.4', 'v1.2.3', '01.2.3', '1.2.3-rc.1', '1.2.x', ' 1.2.3'])(
    'rejects %j',
    (text) => expect(parseVersion(text)).toBeNull(),
  );
});

describe('compareVersions', () => {
  it('orders by major, then minor, then patch', () => {
    expect(compareVersions('2.0.0', '1.9.9')).toBeGreaterThan(0);
    expect(compareVersions('1.3.0', '1.2.9')).toBeGreaterThan(0);
    expect(compareVersions('1.2.4', '1.2.3')).toBeGreaterThan(0);
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
    expect(compareVersions('1.2.3', '1.10.0')).toBeLessThan(0);
  });
});

describe('bumpVersion', () => {
  it('bumps patch, minor and major and resets the lower parts', () => {
    expect(bumpVersion('1.2.3', 'patch')).toBe('1.2.4');
    expect(bumpVersion('1.2.3', 'minor')).toBe('1.3.0');
    expect(bumpVersion('1.2.3', 'major')).toBe('2.0.0');
  });
});

describe('resolveRelease', () => {
  const base = { custom: '', packageVersion: '0.1.0', tags: [] };

  it('offers the four documented bumps', () => {
    expect(BUMPS).toEqual(['patch', 'minor', 'major', 'custom']);
  });

  it.each([
    ['patch', '0.1.1'],
    ['minor', '0.2.0'],
    ['major', '1.0.0'],
  ])('bumps %s from package.json', (bump, version) => {
    expect(resolveRelease({ ...base, bump })).toEqual({ version, tag: `v${version}`, tagExists: false });
  });

  it('bumps from the newest tag when it is ahead of package.json', () => {
    const tags = ['v0.1.0', 'v0.4.2', 'v0.3.9', 'not-a-tag', 'v1.0', 'v01.0.0', 'release-9.9.9'];
    expect(resolveRelease({ ...base, bump: 'minor', tags }).version).toBe('0.5.0');
  });

  it('bumps from package.json when it is ahead of the newest tag', () => {
    expect(resolveRelease({ ...base, bump: 'patch', packageVersion: '2.0.0', tags: ['v1.0.0'] }).version)
      .toBe('2.0.1');
  });

  it('rejects an unknown bump, naming the choices', () => {
    expect(() => resolveRelease({ ...base, bump: 'huge' })).toThrow('Unknown bump "huge". Choose one of: patch, minor, major, custom.');
    expect(() => resolveRelease({ ...base, bump: undefined })).toThrow('Unknown bump "undefined"');
  });

  it('quotes echoed input so a multi-line value cannot forge workflow commands', () => {
    const forged = '1.0.0\n::set-output name=x::y';
    expect(() => resolveRelease({ ...base, bump: 'custom', custom: forged }))
      .toThrow('Custom version "1.0.0\\n::set-output name=x::y" is not');
    expect(() => resolveRelease({ ...base, bump: 'a\nb' })).toThrow('Unknown bump "a\\nb"');
  });

  it('rejects a package.json version it cannot bump', () => {
    expect(() => resolveRelease({ ...base, bump: 'patch', packageVersion: 'next' })).toThrow('"next" is not MAJOR.MINOR.PATCH');
  });

  it('rejects a custom version typed with a non-custom bump', () => {
    expect(() => resolveRelease({ ...base, bump: 'minor', custom: '1.0.0' })).toThrow('bump is "minor"');
  });

  it('ignores a blank custom field for a non-custom bump', () => {
    expect(resolveRelease({ ...base, bump: 'patch', custom: '   ' }).version).toBe('0.1.1');
  });

  it('accepts a custom version above package.json and the newest tag', () => {
    expect(resolveRelease({ ...base, bump: 'custom', custom: ' 1.4.0 ', tags: ['v0.9.0'] }))
      .toEqual({ version: '1.4.0', tag: 'v1.4.0', tagExists: false });
  });

  it('accepts a leading v on a custom version', () => {
    expect(resolveRelease({ ...base, bump: 'custom', custom: 'v0.3.0' }).version).toBe('0.3.0');
  });

  it('releases the checked-in version when it was never tagged', () => {
    expect(resolveRelease({ ...base, bump: 'custom', custom: '0.1.0' }))
      .toEqual({ version: '0.1.0', tag: 'v0.1.0', tagExists: false });
  });

  it.each(['', 'abc', '1.2', '1.2.3-rc.1'])('rejects the invalid custom version %j', (custom) => {
    expect(() => resolveRelease({ ...base, bump: 'custom', custom })).toThrow('is not MAJOR.MINOR.PATCH');
  });

  it('rejects a custom version below package.json', () => {
    expect(() => resolveRelease({ ...base, bump: 'custom', custom: '0.0.9' }))
      .toThrow('must be greater than the latest released version 0.1.0');
  });

  it('rejects a custom version that is not above the newest tag', () => {
    const tags = ['v0.1.0', 'v0.6.0'];
    expect(() => resolveRelease({ ...base, bump: 'custom', custom: '0.5.0', tags }))
      .toThrow('must be greater than the latest released version 0.6.0');
  });

  it('treats an existing tag as a resume, even below the newest tag', () => {
    const tags = ['v0.1.0', 'v0.6.0'];
    expect(resolveRelease({ ...base, bump: 'custom', custom: '0.1.0', tags }))
      .toEqual({ version: '0.1.0', tag: 'v0.1.0', tagExists: true });
  });
});

const CHANGELOG = [
  '# 0.2.0 (2026-12-01)',
  '',
  '## Highlights',
  '<!-- TODO: Highlights — left blank for the human author. -->',
  '',
  '## ✨ Features',
  '- ✨ Add a thing. (#1)',
  '',
  '### Nested',
  'Detail under features.',
  '',
  '## 👥 Contributors',
  '',
  '- @someone',
  '',
  '# 0.1.10 (2026-11-17)',
  '',
  '## 🐛 Fixes',
  '- 🐛 Old fix. (#0)',
  '',
  '# 0.1.0 (2026-11-01)',
  '## ✨ Features',
  '- ✨ First.',
].join('\n');

describe('extractChangelogEntry', () => {
  it('returns the entry body without heading, comments or empty sections', () => {
    expect(extractChangelogEntry(CHANGELOG, '0.2.0')).toBe([
      '## ✨ Features',
      '- ✨ Add a thing. (#1)',
      '',
      '### Nested',
      'Detail under features.',
      '',
      '## 👥 Contributors',
      '',
      '- @someone',
      '',
    ].join('\n'));
  });

  it('stops at the next level-1 heading', () => {
    expect(extractChangelogEntry(CHANGELOG, '0.1.10')).toBe('## 🐛 Fixes\n- 🐛 Old fix. (#0)\n');
  });

  it('reads the last entry to the end of the file and does not confuse 0.1.1 with 0.1.10', () => {
    expect(extractChangelogEntry(CHANGELOG, '0.1.0')).toBe('## ✨ Features\n- ✨ First.\n');
    expect(() => extractChangelogEntry(CHANGELOG, '0.1.1')).toThrow('no "# 0.1.1" entry');
  });

  it('accepts a BOM, CRLF line endings and a v prefix or a heading without a date', () => {
    const text = '﻿# v1.0.0\r\n\r\nIntro paragraph.\r\n\r\n## Fixes\r\n- fixed\r\n';
    expect(extractChangelogEntry(text, '1.0.0')).toBe('Intro paragraph.\n\n## Fixes\n- fixed\n');
  });

  it('does not treat lines inside a fenced code block as headings', () => {
    const text = [
      '# 1.0.0 (2026-01-01)',
      '## ✨ Features',
      '- Install with:',
      '```bash',
      '# install',
      '## not a section',
      'npm ci',
      '```',
      '~~~',
      '# also not a heading',
      '~~~',
      '',
      '# 0.9.0',
      '- old',
    ].join('\n');
    expect(extractChangelogEntry(text, '1.0.0')).toBe([
      '## ✨ Features',
      '- Install with:',
      '```bash',
      '# install',
      '## not a section',
      'npm ci',
      '```',
      '~~~',
      '# also not a heading',
      '~~~',
      '',
    ].join('\n'));
  });

  it('does not find an entry heading inside a fenced code block', () => {
    const text = '# 0.9.0\n```md\n# 1.0.0\n- fake\n```\n';
    expect(() => extractChangelogEntry(text, '1.0.0')).toThrow('no "# 1.0.0" entry');
  });

  it('drops the --- rule the changelog skill puts between entries', () => {
    const text = '# 1.0.0 (2026-01-01)\n\n## Fixes\n- fixed\n\n---\n\n# 0.9.0\n- old\n';
    expect(extractChangelogEntry(text, '1.0.0')).toBe('## Fixes\n- fixed\n');
  });

  it('keeps a --- rule that is not at the end of the entry', () => {
    const text = '# 1.0.0\n\n## Fixes\n- a\n\n---\n\n- b\n';
    expect(extractChangelogEntry(text, '1.0.0')).toBe('## Fixes\n- a\n\n---\n\n- b\n');
  });

  it('fails on an entry that is only a heading or only empty sections and a rule', () => {
    expect(() => extractChangelogEntry('# 1.0.0 (2026-01-01)', '1.0.0')).toThrow('has no content');
    expect(() => extractChangelogEntry('# 1.0.0\n\n## Highlights\n\n---\n\n# 0.9.0\n', '1.0.0'))
      .toThrow('has no content');
  });

  it('fails when the entry only contains comments and headings', () => {
    const text = '# 1.0.0 (2026-01-01)\n\n## Highlights\n<!-- TODO -->\n\n## Fixes\n\n# 0.9.0\n- x';
    expect(() => extractChangelogEntry(text, '1.0.0')).toThrow('entry for 1.0.0 has no content');
  });

  it('leaves no comment behind when removing one joins the fragments around it', () => {
    const text = '# 1.0.0\n\n- keep <!<!-- a -->-- hidden --> me\n';
    expect(extractChangelogEntry(text, '1.0.0')).toBe('- keep  me\n');
  });

  it('fails on an unclosed comment instead of publishing notes it would hide', () => {
    expect(() => extractChangelogEntry('# 1.0.0\n\n- shown\n<!-- TODO\n- hidden\n', '1.0.0'))
      .toThrow('"<!--" comment that is never closed');
  });

  it('fails when the version is missing, telling the operator what to do', () => {
    expect(() => extractChangelogEntry(CHANGELOG, '9.9.9')).toThrow('Add it (om-auto-update-changelog) and merge it first.');
  });
});

describe('runRelease', () => {
  function effects(overrides = {}) {
    const files = {
      'package.json': JSON.stringify({ version: '0.1.0' }),
      'CHANGELOG.md': '# 0.1.1 (2026-11-18)\n\n## Fixes\n- fixed\n',
    };
    return {
      env: { BUMP: 'patch', RELEASE_NOTES_FILE: '/tmp/notes.md' },
      readText: vi.fn((path) => files[path]),
      writeText: vi.fn(),
      listTags: vi.fn(() => ['v0.1.0']),
      appendOutput: vi.fn(),
      ...overrides,
    };
  }

  it('writes the notes and reports version, tag and tag_exists', () => {
    const io = effects();
    expect(runRelease(io)).toEqual({ version: '0.1.1', tag: 'v0.1.1', tagExists: false });
    expect(io.writeText).toHaveBeenCalledWith('/tmp/notes.md', '## Fixes\n- fixed\n');
    expect(io.appendOutput).toHaveBeenCalledWith('version=0.1.1\ntag=v0.1.1\ntag_exists=false');
  });

  it('passes a custom version through', () => {
    const io = effects({ env: { BUMP: 'custom', CUSTOM_VERSION: '0.1.1', RELEASE_NOTES_FILE: '/tmp/n.md' } });
    expect(runRelease(io).version).toBe('0.1.1');
  });

  it('fails before writing anything when the changelog entry is missing', () => {
    const io = effects({ env: { BUMP: 'minor', RELEASE_NOTES_FILE: '/tmp/notes.md' } });
    expect(() => runRelease(io)).toThrow('no "# 0.2.0" entry');
    expect(io.writeText).not.toHaveBeenCalled();
    expect(io.appendOutput).not.toHaveBeenCalled();
  });

  it('requires a notes file', () => {
    const io = effects({ env: { BUMP: 'patch' } });
    expect(() => runRelease(io)).toThrow('RELEASE_NOTES_FILE');
    expect(io.readText).not.toHaveBeenCalled();
  });

  it('reports a missing bump as an unknown bump', () => {
    const io = effects({ env: { RELEASE_NOTES_FILE: '/tmp/notes.md' } });
    expect(() => runRelease(io)).toThrow('Unknown bump "undefined"');
  });
});
