import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Dependency-direction guardrails. The allowed graph is:
 *
 *   app ──> core ──> db
 *    └────> ui
 *
 * Each package forbids importing the workspaces it must not depend on, so a
 * cycle-introducing import fails lint (acceptance criterion #9). The third-party list
 * keeps framework code where it belongs (primitives spec, Architecture): `core` and `db`
 * import neither `next` nor `react`, and `ui` — presentational, with no `next`
 * dependency — imports no `next`. `next/headers` and `redirect` live in
 * `packages/app/src/lib/session.ts`.
 *
 * One `no-restricted-imports` entry per package: flat config replaces, rather than
 * merges, a rule's options when a later block matches the same file.
 */
const boundary = (files, forbidden, thirdParty = []) => ({
  files,
  rules: {
    "no-restricted-imports": [
      "error",
      {
        // A bare name is matched exactly (`paths`); its subpaths by an anchored pattern,
        // so `next` forbids `next` and `next/headers` but not some `foo/next`.
        paths: thirdParty.map((name) => ({
          name,
          message: `Framework boundary violation: this package must not import ${name}.`,
        })),
        patterns: [
          ...forbidden.map((name) => ({
            group: [name, `${name}/*`],
            message: `Dependency-direction violation: this package must not import ${name}.`,
          })),
          ...thirdParty.map((name) => ({
            group: [`${name}/*`],
            message: `Framework boundary violation: this package must not import ${name}.`,
          })),
        ],
      },
    ],
  },
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: { rootDir: "packages/app" },
    },
  },
  // ui is presentational — no domain/data imports.
  boundary(
    ["packages/ui/**/*.{ts,tsx}"],
    ["@devmentor/core", "@devmentor/db", "@devmentor/app"],
    ["next"],
  ),
  // db is the leaf — knows nothing about the rest.
  boundary(
    ["packages/db/**/*.{ts,tsx}"],
    ["@devmentor/core", "@devmentor/ui", "@devmentor/app"],
    ["next", "react", "react-dom"],
  ),
  // core may use db, but not the UI or the host app.
  boundary(
    ["packages/core/**/*.{ts,tsx}"],
    ["@devmentor/ui", "@devmentor/app"],
    ["next", "react", "react-dom"],
  ),
  globalIgnores([
    ".next/**",
    "**/.next/**",
    "out/**",
    "build/**",
    "**/storybook-static/**",
    "packages/ui/.storybook/public/prototypes/**",
    "packages/ui/.storybook/public/mockServiceWorker.js",
    "coverage/**",
    "test-results/**",
    "**/next-env.d.ts",
    "packages/db/migrations/**",
  ]),
]);

export default eslintConfig;
