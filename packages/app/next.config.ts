import type { NextConfig } from "next";
import { loadRepoEnv } from "./src/lib/repo-env";
import { securityHeaders } from "./src/lib/security-headers";

// Next reads env files only from this package; the documented `.env` is the repo root.
// Resolved here, not in the helper: Next compiles this config next to itself, so
// `import.meta.url` is always `packages/app/`.
loadRepoEnv(new URL("../../.env", import.meta.url));

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*"],
  // Workspace packages are shipped as TypeScript source; Next transpiles them.
  transpilePackages: ["@devmentor/core", "@devmentor/db", "@devmentor/ui"],
  // Keep the ORM and its driver out of the bundle — they are Node-only and rely on
  // dynamic requires that must not be bundled.
  serverExternalPackages: [
    "@mikro-orm/core",
    "@mikro-orm/postgresql",
    "@mikro-orm/migrations",
    "@mikro-orm/seeder",
    "pino",
  ],
  // Anti-clickjacking and other response headers, on every route.
  headers: async () => securityHeaders(),
};

export default nextConfig;
