import { randomUUID } from "node:crypto";
import { defineEntity, p } from "@mikro-orm/postgresql";

// Example entity — shows the project conventions (defineEntity, uuid PK,
// timestamps). Replace or extend it as the real domain model lands.
export const UserSchema = defineEntity({
  name: "User",
  tableName: "users",
  properties: {
    id: p.uuid().primary().onCreate(() => randomUUID()),
    email: p.string().length(320).unique(),
    name: p.string().nullable(),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
});

export class User extends UserSchema.class {}
UserSchema.setClass(User);
