## 🤖 `om-auto-review-pr` — design CI blocker

The design sources and the separate reporting spec have completed source review, but required Unit tests on design head `8d31d17` failed in [workflow run 42230628275](https://github.com/warnaa/aitl-mentio/actions/runs/42230628275): Vitest collects the existing native `scripts/ci/change-scope.test.mjs` and reports “No test suite found”, even though its four Node assertions pass. The run's 1,500 application tests passed. This is the same base test-runner mismatch reproduced locally before payment implementation.

The fix is already in #72: npm's unit/coverage commands run the native test with `node --test`, and Vitest excludes that test file from its own incompatible discovery. No assertion is removed. Do not mix the product implementation into this design-only branch just to inherit that fix. The design PR remains blocked from merging until the test-runner fix reaches its base; its content approval and CI status are separate facts.

No merge is performed by this run. After the implementation's required human money review and QA, update this design branch from the corrected base as appropriate and recheck CI.
