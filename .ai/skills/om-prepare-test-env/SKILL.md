# DevMentor local test environment

The native Windows entrypoint is:

```powershell
powershell -ExecutionPolicy Bypass -File .ai/scripts/test-env-up.ps1
powershell -ExecutionPolicy Bypass -File .ai/scripts/test-env-down.ps1
```

The scripts derive the checkout root and use `.ai/scripts/test-env.mjs` for
lifecycle management. Node >=24 can load the integration environment helper
without tsx; cold startup therefore works before dependencies are installed.

The exact chain is `npm ci` (on preparation cache miss), disposable
`postgres:17-alpine` on a random loopback port, `npm run db:migrate`,
`npm run db:seed` twice, `npm run build` (on cache miss), then
`npm run start --workspace @devmentor/app -- --hostname 127.0.0.1 --port <free-port>`.
Use the workspace npm start command: direct Next CLI invocation from the root
failed to resolve `./src/lib/repo-env` during Next configuration loading.
Native Windows teardown must kill the owned npm process tree, as the suite does.

The local npm-pinned agent-browser is installed and verified with `install` and
`doctor --json`. Failed provisioning retries on the next cold startup.
Mock GitHub sign-in uses the descriptor's `loginPath`; no password is required.
The independent Vitest integration runner provisions its own instance. Stop this
QA instance before running that suite or rebuilding in the same checkout because
both use `packages/app/.next`. The lifetime lock protects generated bootstraps;
unrelated manual npm commands do not honor it.

Docker requires access to Docker Desktop's named pipe. A sandbox permission
failure does not prove Docker is unavailable; use the authorized execution context.
If an owner is forcibly killed, the script refuses arbitrary PID cleanup. Inspect
the recorded owned processes/container before recovering the stale lock.

Preparation timeouts must stop the entire owned process tree before returning;
stopping only the Windows command wrapper leaves npm/build children alive. The
descriptor preserves the fingerprint validated for the build and checks it again
after browser/app startup, refusing readiness if source changed in that interval.
Regression command: `npm run test:unit -- scripts/qa/test-env.test.mjs`.

Measured on 2026-11-05: cold preparation/startup 97.504s, warm reuse 0.157s;
after verified double teardown, a fresh database/app using the build cache
started in 14.415s and warm reuse took 0.146s. Teardown verified container,
app process and port removal. Source timestamp invalidation and exact restoration
passed. Runtime state under `.ai/qa/` is gitignored. Commit the scripts, spec,
local skill and line-ending/ignore rules together when publishing is approved;
keep `.ai/runs/` and generated runtime state out of commits.
