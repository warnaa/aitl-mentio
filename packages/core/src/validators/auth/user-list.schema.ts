import type { z } from "zod";
import { paginationQuerySchema } from "../pagination.schema";

export const userListSchema = paginationQuerySchema;

export type UserListQuery = z.infer<typeof userListSchema>;
