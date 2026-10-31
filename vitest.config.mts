import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["packages/*/src/**/*.test.{ts,tsx}", "scripts/**/*.test.mjs", "packages/ui/scripts/**/*.test.mjs"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          globalSetup: ["tests/integration/setup/global-setup.ts"],
          setupFiles: ["tests/integration/setup/env.ts"],
          // Boots Postgres + the production server once; suites share it serially.
          fileParallelism: false,
          testTimeout: 60_000,
          hookTimeout: 180_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      // Listing sources (not just files touched by tests) makes an untested file count as 0%.
      include: ["packages/*/src/**/*.{ts,tsx}", "scripts/**/*.mjs", "packages/ui/scripts/**/*.mjs"],
      exclude: [
        "**/*.test.{ts,tsx,mjs}",
        // shadcn primitives: CLI-generated vendor code, rendered by the integration suite.
        "packages/ui/src/components/ui/**",
        // Generated migrations: exercised by `db:migrate` in the integration suite.
        "packages/db/src/migrations/**",
        // Type-only files and pure re-export barrels: no runtime code to cover. Listed one
        // by one so a barrel that grows logic (e.g. `db/src/entities/index.ts`) is not hidden.
        "packages/db/src/index.ts",
        "packages/core/src/container/index.ts",
        "packages/core/src/http/index.ts",
        "packages/ui/src/backend/{actions,api,feedback,forms,layout,tables}/index.ts",
        "packages/ui/src/lib/utils.ts",
        "packages/core/src/container/cradle.ts",
        "packages/ui/src/backend/api/types.ts",
        // Config entry points read by tools (Next, MikroORM CLI), not by app code.
        "packages/app/next.config.ts",
        "packages/db/src/mikro-orm.config.ts",
      ],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
      reporter: ["text", "html", "json-summary"],
    },
  },
});
