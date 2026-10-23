import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Env files live at the monorepo root (shared with the MikroORM CLI), not in packages/app.
loadEnvConfig(`${import.meta.dirname}/../..`);

const nextConfig: NextConfig = {
  // Workspace packages (@mentio/*) ship TypeScript source and are transpiled by
  // Next automatically. The ORM stack stays external: it relies on Node APIs and
  // dynamic driver loading that should not be bundled. (@mikro-orm/core is on
  // Next's built-in list already.)
  serverExternalPackages: ["@mikro-orm/postgresql", "@mikro-orm/sql", "@mikro-orm/migrations", "pg"],
};

export default nextConfig;
