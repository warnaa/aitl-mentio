import { makeCrudRoute } from "@mentio/core/http";
import { userListSchema } from "@mentio/core/validators/auth/user-list.schema";

export const dynamic = "force-dynamic";

// Reference example for plain CRUD resources: config only, no logic in the route file.
export const { GET } = makeCrudRoute({
  list: {
    query: userListSchema,
    run: ({ userService }, { query }) => userService.list(query),
  },
});
