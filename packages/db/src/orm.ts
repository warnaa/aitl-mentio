import { MikroORM } from "@mikro-orm/postgresql";
import { createOrmConfig } from "./config";

// One ORM (and therefore one connection pool) per process. Cached on
// globalThis so Next.js dev-mode module reloads reuse it instead of leaking pools.
const globalForOrm = globalThis as typeof globalThis & {
  __mentioOrm?: Promise<MikroORM>;
};

export function getOrm(): Promise<MikroORM> {
  globalForOrm.__mentioOrm ??= MikroORM.init(createOrmConfig()).catch((error: unknown) => {
    globalForOrm.__mentioOrm = undefined;
    throw error;
  });
  return globalForOrm.__mentioOrm;
}

export async function closeOrm(): Promise<void> {
  const orm = globalForOrm.__mentioOrm;
  globalForOrm.__mentioOrm = undefined;
  if (orm) await (await orm).close();
}
