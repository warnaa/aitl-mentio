import { requirePageRole } from "../../../lib/session";
import { UsersList } from "./UsersList";

export const dynamic = "force-dynamic";

/**
 * `/admin/users`, operators only. Guards here as well as in the admin layout: a
 * client-side navigation from `/admin` re-runs this page but not the layout, so a
 * revoked operator is refused on the next navigation (edge case 21).
 */
export default async function UsersPage() {
  await requirePageRole("operator", "/admin/users");
  return <UsersList />;
}
