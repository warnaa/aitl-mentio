# Reusable local test environment

## Problem / Goal

The integration suite tears its app down at completion. QA skills need a running,
isolated instance and a repeatable native PowerShell command to attach to it.

## Non-goals

No product changes, deployment, shared database access, or replacement of the
Vitest integration suite. Runtime state, credentials and logs stay uncommitted.

## Approach

PowerShell up/down entrypoints invoke a portable Node lifecycle helper, reusing
the integration child environment and npm invocation helpers. A lifetime owner
process holds an atomic lock, creates a loopback-only disposable PostgreSQL 17
container, migrates/seeds and starts Next production on a free loopback port.
Preparation uses a checkout-scoped fingerprint and validates build artifacts.
Reuse requires live owner/app processes, matching source fingerprint, bounded
age, shell readiness, database health and an authenticated mock operator probe.
Only the owner cleans up its child and labeled container. Teardown requests that
owner to stop, avoiding arbitrary PID kills based on a stale descriptor.

## Acceptance criteria

- Native Windows up/down commands work without editing the root environment.
- Cold start writes the shared descriptor with service and browser status.
- Warm start preserves run ID, processes and database without rebuilding.
- Source changes invalidate reuse/cache; missing artifacts invalidate cache.
- Errors clean up owned resources; teardown twice is safe.
- Browser installation/doctor failures are reported honestly.
- Existing integration tests retain their independent environment and runner.

## Validation

Run cold and warm startup, fingerprint invalidation, two teardown invocations,
then restart for consumers. Record measured timings and any blockers locally.
