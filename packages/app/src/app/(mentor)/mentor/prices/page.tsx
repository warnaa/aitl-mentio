import { requirePageRole } from '../../../../lib/session';
import { MentorPrices } from './MentorPrices';
export const dynamic = 'force-dynamic';
export default async function MentorPricesPage() {
  await requirePageRole('mentor', '/mentor/prices');
  return <MentorPrices />;
}
