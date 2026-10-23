import { randomUUID } from "node:crypto";
import { p } from "@mikro-orm/postgresql";

/**
 * Columns every entity carries: a UUID primary key (no sequential IDs to enumerate)
 * and timestamps. A function, so each entity gets its own property builders.
 */
export function baseProperties() {
  return {
    id: p.uuid().primary().onCreate(() => randomUUID()),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  };
}
