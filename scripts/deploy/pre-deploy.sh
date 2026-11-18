#!/bin/sh
# Railway pre-deploy step for the `web` service (docs/deployment.md). Runs in the
# freshly built image before traffic switches to it; a failure keeps the old deployment.
# Seeds the demo accounts only where SEED_DEMO_DATA=true (the `preview` environment and
# the PR environments forked from it), never in production.
set -eu

npm run db:migrate

if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
  npm run db:seed
fi
