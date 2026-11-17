import { requirePageRole, withPageScope } from '../../../lib/session';
import { PlatformSettingsForm } from './PlatformSettingsForm';

export const dynamic = 'force-dynamic';
const PATH = '/admin/settings';

/**
 * `/admin/settings`, operators only (E05-S02): the price bounds and the platform fee, with the
 * mentors whose current prices the bounds flag. Their prices are listed, never changed (R08).
 */
export default async function AdminSettingsPage() {
  await requirePageRole('operator', PATH);
  const initial = await withPageScope(PATH, async cradle => {
    const settings = await cradle.platformSettingsService.getForOperator();
    return { settings, outOfBounds: await cradle.mentorProfileService.listOutOfBounds(settings) };
  });
  return <div className="dm-product-stack">
    <div className="dm-page-heading">
      <p className="dm-page-eyebrow">Operations</p>
      <h1>Platform settings</h1>
      <p>Set the price bounds every mentor is held to and the platform fee.</p>
    </div>
    <PlatformSettingsForm initial={initial} />
  </div>;
}
