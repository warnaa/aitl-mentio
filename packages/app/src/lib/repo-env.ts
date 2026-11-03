/**
 * Load the repository-root `.env` into `process.env`.
 *
 * Next reads env files only from its own project directory (`packages/app/`), but the
 * documented location — and the one `npm run setup` writes — is the repo root, so
 * `next.config.ts` calls this for every `dev` / `build` / `start`. The MikroORM CLI
 * does the same in `packages/db/src/mikro-orm.config.ts`.
 *
 * `process.loadEnvFile` never overwrites a variable that is already set (even to an
 * empty string), so the real environment keeps winning over `.env`. Values still reach
 * application code only through the zod schemas.
 *
 * A missing file is normal (CI, containers, a fresh clone) and ignored; any other
 * failure is rethrown so an unreadable `.env` is not silently skipped.
 *
 * @param path the `.env` file; `next.config.ts` resolves it, because Next bundles the
 *   config and this module's own location is not stable.
 */
export function loadRepoEnv(path: string | URL): void {
  try {
    process.loadEnvFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}
