import { MikroORM } from "@mikro-orm/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entities } from "./index";
import { User, UserSchema } from "./auth/user.entity";

// Metadata discovery needs no connection: MikroORM 7 connects lazily on the first query.
let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({ clientUrl: "postgresql://mentio@127.0.0.1:1/mentio", entities });
});

afterAll(async () => {
  await orm.close();
});

describe("entities", () => {
  it("registers every entity schema", () => {
    expect(entities).toEqual([UserSchema]);
  });

  it("maps User to the plural snake_case users table", () => {
    const meta = orm.getMetadata().get(User);
    expect(meta.tableName).toBe("users");
    expect(meta.className).toBe("User");
    expect(meta.class).toBe(User);
    expect(meta.properties.createdAt.fieldNames).toEqual(["created_at"]);
    expect(meta.properties.updatedAt.fieldNames).toEqual(["updated_at"]);
    expect(meta.properties.email).toMatchObject({ unique: true, length: 320 });
    expect(meta.properties.name.nullable).toBe(true);
    expect(meta.primaryKeys).toEqual(["id"]);
  });

  it("fills base properties on create and bumps updatedAt on update", () => {
    const meta = orm.getMetadata().get(User);
    const user = orm.em.fork().create(User, { email: "ada@example.com" });

    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
    expect(meta.properties.updatedAt.onUpdate?.(user, orm.em)).toBeInstanceOf(Date);
  });
});
