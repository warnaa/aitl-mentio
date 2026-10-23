// Runs in each test worker: points `@mentio/db` / `@mentio/core` at the stack from global-setup.
import { inject } from "vitest";

process.env.DATABASE_URL = inject("databaseUrl");
process.env.JWT_SECRET = inject("jwtSecret");
