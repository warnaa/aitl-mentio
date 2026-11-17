import { createNodeEffects } from './effects.mjs';
import { runRelease } from './release.mjs';

// Entry point for the `Release` workflow. A failure becomes an Actions error
// annotation and a non-zero exit code; `process.exitCode` lets stdout flush first.
try {
  runRelease(createNodeEffects());
} catch (error) {
  console.error(`::error::${error.message}`);
  process.exitCode = 1;
}
