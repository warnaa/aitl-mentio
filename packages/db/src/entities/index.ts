import { UserSchema } from "./auth/user.entity";

export { User, UserSchema } from "./auth/user.entity";

/** Every entity the ORM knows about. Register new entity schemas here. */
export const entities = [UserSchema];
