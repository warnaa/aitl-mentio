export { createOrmConfig } from "./config";
export { getOrm, closeOrm } from "./orm";
export * from "./entities";
export type { EntityManager, MikroORM, Options as OrmOptions } from "@mikro-orm/postgresql";
