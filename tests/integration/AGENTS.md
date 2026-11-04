# Integration and browser tests

- `npm run test:integration` creates ephemeral PostgreSQL with Testcontainers,
  builds/starts the app and runs agent-browser scenarios.
- Own all data and infrastructure: use random ports, apply migrations, create
  and seed prerequisites, and clean up browser sessions, app processes and
  containers on success and failure. Never depend on the developer database,
  fixed ports or shared/demo state.
- `environment.ts` is the documented exception allowing direct `process.env`
  access to inherit the parent environment for migration/build/app child
  processes. Pin every documented key so a developer's `.env` cannot leak in.
- Use the pinned local `agent-browser` executable. Observe the live accessibility
  tree first, assert semantic roles/text rather than guessed CSS, capture
  screenshots at key assertions and close each isolated session in `finally`.
- `npm run test:browser:install` installs Chrome locally; use
  `npm run test:browser:install:ci` on Linux CI for system dependencies too.
