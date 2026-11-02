import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const workspace = (name) => [`@mentio/${name}`, `@mentio/${name}/*`];
const frameworks = ["next", "next/*", "react", "react/*", "react-dom", "react-dom/*"];
const orm = ["@mikro-orm/*"];

/** Layering: app → core → db; ui is standalone and importable by app only. */
const boundary = (files, patterns) => ({
  files,
  rules: { "no-restricted-imports": ["error", { patterns }] },
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: { rootDir: "packages/app/" },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-empty": ["error", { allowEmptyCatch: false }],
    },
  },
  {
    // Register dependencies explicitly in container.ts. loadModules is also the only path
    // to the allowlisted `braces` advisory (scripts/audit-allowlist.json).
    files: ["packages/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...["ImportSpecifier[imported.name='loadModules']", "MemberExpression[property.name='loadModules']"].map(
          (selector) => ({ selector, message: "awilix loadModules is banned: register dependencies explicitly." }),
        ),
      ],
    },
  },
  boundary(
    ["packages/app/**"],
    [
      {
        group: [...workspace("db"), ...orm],
        message: "app reaches the data layer through @mentio/core (app → core → db).",
      },
    ],
  ),
  boundary(
    ["packages/core/**"],
    [
      { group: [...workspace("app"), ...workspace("ui")], message: "core must not import app or ui." },
      { group: frameworks, message: "core is framework-agnostic: no next/react imports." },
      { group: orm, message: "Only @mentio/db imports MikroORM; use the types it re-exports." },
    ],
  ),
  boundary(
    ["packages/db/**"],
    [
      {
        group: [...workspace("app"), ...workspace("core"), ...workspace("ui")],
        message: "db is the bottom layer (app → core → db) and imports no workspace package.",
      },
      { group: frameworks, message: "db is framework-agnostic: no next/react imports." },
    ],
  ),
  boundary(
    ["packages/ui/**"],
    [
      {
        group: [...workspace("app"), ...workspace("core"), ...workspace("db"), ...orm],
        message: "ui is standalone: it must not import app, core, db or MikroORM.",
      },
    ],
  ),
  {
    files: ["packages/app/**/*.{ts,tsx}", "packages/ui/**/*.{ts,tsx}"],
    ignores: ["packages/ui/src/backend/api/apiCall.ts", "**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "Call /api/* through apiCall/apiCallOrThrow from @mentio/ui/backend/api." },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    "**/node_modules/**",
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/coverage/**",
    "**/storybook-static/**",
    // MSW-generated browser worker, regenerated via `msw init`.
    "packages/ui/.storybook/public/mockServiceWorker.js",
    // Local prototype copies and lesson materials are not product code.
    "packages/ui/.storybook/public/prototypes/**",
    "lekcja-07/**",
    "**/next-env.d.ts",
    // Vendored agent skills (Open Mercato), updated from upstream and not project code. User decision 2026-11-01.
    ".agents/**",
  ]),
]);

export default eslintConfig;
