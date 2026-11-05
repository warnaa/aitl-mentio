import Link from "next/link";
import { ShieldCheck, Users } from "lucide-react";
import { Badge, Button, Card } from "@devmentor/ui";
import { checkDbConnection, getEnv } from "@devmentor/core";
import { requirePageRole } from "../../lib/session";

// Touches the DB — keep it out of the static prerender.
export const dynamic = "force-dynamic";

/**
 * `/admin`, the operator home composed as the prototype's s24 screen. Operators only.
 * The service-status panel keeps the database check the bootstrap required (spec A14);
 * it still degrades to "Unavailable" rather than failing, but the guard comes first: with
 * a session cookie and no database, the session cannot be checked and the error page
 * renders instead (fail closed).
 */
export default async function AdminDashboard() {
  await requirePageRole("operator", "/admin");
  const env = getEnv();
  const db = await checkDbConnection();

  return (
    <div className="dm-product-stack">
      <div className="dm-page-heading">
        <p className="dm-page-eyebrow">Operations</p>
        <h1>Operator workspace</h1>
        <p>Open the user directory to review accounts and their assigned roles.</p>
      </div>
      <Card className="dm-product-panel">
        <ShieldCheck aria-hidden="true" />
        <h2 className="dm-product-title">Account access</h2>
        <p className="dm-product-muted">
          Roles come from account records, invitations and operator configuration. Users cannot assign themselves a role.
        </p>
        <Button asChild>
          <Link href="/admin/users">
            <Users aria-hidden="true" />
            View users
          </Link>
        </Button>
      </Card>
      <Card className="dm-product-panel">
        <h2 className="dm-product-title">Service status</h2>
        <div className="dm-fact-chips" role="group" aria-label={`${env.APP_NAME} instance`}>
          <Badge variant="outline">{`Environment: ${env.NODE_ENV}`}</Badge>
          <span className="dm-product-status" data-tone={db.ok ? "success" : "error"}>
            {db.ok ? "Connected" : "Unavailable"}
          </span>
        </div>
        <p className="dm-product-caption">Database connection, checked when this page loads.</p>
      </Card>
    </div>
  );
}
