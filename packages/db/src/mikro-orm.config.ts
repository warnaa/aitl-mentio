// Config picked up by the MikroORM CLI (`npm run db:*` scripts).
import { Migrator } from "@mikro-orm/migrations";
import { existsSync } from "node:fs";
import { createOrmConfig } from "./config";

// Env files live at the monorepo root, shared with the Next.js app.
const rootEnvFile = `${import.meta.dirname}/../../../.env`;
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

const migrationsPath = `${import.meta.dirname}/migrations`;

export default createOrmConfig({
  extensions: [Migrator],
  migrations: {
    path: migrationsPath,
    pathTs: migrationsPath,
    emit: "ts",
    // Fixed name — the default (`.snapshot-<dbName>`) would create one file per database.
    snapshotName: ".snapshot-mentio",
  },
});
