import { Card } from '@devmentor/ui';
import { EmptyState } from '@devmentor/ui/backend';
import { LocalTime } from '@devmentor/ui/time';
import { requirePageRole, withPageScope } from '../../../lib/session';

export const dynamic = 'force-dynamic';
const PATH = '/admin/sessions';

/**
 * `/admin/sessions`, operators only: how many versions of each session's private note the mentee
 * declined, D20's signal for co-editing. Counts and party names only; a note's body and comment
 * stay with the two parties, and operators get 404 from the note routes.
 */
export default async function AdminSessionsPage() {
  await requirePageRole('operator', PATH);
  const { rows } = await withPageScope(PATH, async cradle => ({ rows: await cradle.sessionNoteService.declineReport() }));
  return <div className="dm-product-stack">
    <div className="dm-page-heading">
      <p className="dm-page-eyebrow">Operations</p>
      <h1>Private note declines</h1>
      <p>More than one decline on a session means the mentor and mentee may need co-editing. Note text is never shown here.</p>
    </div>
    {rows.length === 0 ? <EmptyState title="No declined notes" description="Sessions appear here once a mentee declines a private note." /> : <Card className="dm-product-panel min-w-0 overflow-x-auto">
      <table className="w-full text-left">
        <caption className="sr-only">Sessions with declined private notes</caption>
        <thead><tr><th scope="col">Session start</th><th scope="col">Mentor</th><th scope="col">Mentee</th><th scope="col" className="text-right">Note declines</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.bookingId}><th scope="row" className="py-2 font-normal"><LocalTime value={row.startsAt} /></th><td>{row.mentorName}</td><td>{row.menteeName}</td><td className="text-right">{row.declineCount}</td></tr>)}</tbody>
      </table>
    </Card>}
  </div>;
}
