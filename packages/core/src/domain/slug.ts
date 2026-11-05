export const MAX_SLUG_LENGTH = 60;
export const MAX_SLUG_ATTEMPTS = 100;
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'admin',
  'api',
  'auth',
  'home',
  'mentor',
  'mentors',
  'invitation',
  'sign-in',
  'sign-up',
  'settings',
  'support',
  'help',
  'new',
  'me',
]);

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');
}

/** Persistence owns arbitration; this pure helper only chooses the next candidate. */
export function uniqueSlug(name: string, occupied: ReadonlySet<string>): string {
  const base = slugify(name) || 'mentor';
  for (let index = 1; ; index += 1) {
    const suffix = index === 1 ? '' : `-${index}`;
    const candidate = `${base.slice(0, MAX_SLUG_LENGTH - suffix.length).replace(/-+$/g, '')}${suffix}`;
    if (!RESERVED_SLUGS.has(candidate) && !occupied.has(candidate)) return candidate;
  }
}
