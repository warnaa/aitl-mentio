# om-prepare-test-env: generated entrypoint (contract v2)
# history:
#   2026-11-05 generated: request owner cleanup; never kill an unverified PID.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Push-Location $RepoRoot
try {
    & node .ai/scripts/test-env.mjs down @args
    if ($LASTEXITCODE -ne 0) { throw "Test environment teardown failed (exit $LASTEXITCODE)." }
} finally { Pop-Location }
