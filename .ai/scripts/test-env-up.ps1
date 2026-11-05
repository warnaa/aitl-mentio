# om-prepare-test-env: generated entrypoint (contract v2)
# regenerate with: om-prepare-test-env --regenerate
# history:
#   2026-11-05 generated: persistent isolated QA owner; reuse integration configuration.
#   2026-11-05 repair: workspace npm start preserves Next config resolution.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Push-Location $RepoRoot
try {
    & node .ai/scripts/test-env.mjs up @args
    if ($LASTEXITCODE -ne 0) { throw "Test environment startup failed (exit $LASTEXITCODE)." }
} finally { Pop-Location }
