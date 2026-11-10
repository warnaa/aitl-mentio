'use client';
import { useMemo, useState } from 'react';
import { platformSettingsFieldsSchema } from '@devmentor/core/validators/operator/platform-settings-update.schema';
import { CrudForm, EmptyState } from '@devmentor/ui/backend';
import { Card } from '@devmentor/ui/components/card';
import { LocalTime } from '@devmentor/ui/time';

interface Bounds { minCents: number; maxCents: number }
export interface SettingsView {
  currency: string;
  priceBounds: { p25: Bounds; p50: Bounds };
  feePercent: number;
  version: number;
  updatedAt: string | null;
  updatedBy: { displayName: string } | null;
}
export interface FlaggedMentor {
  mentorProfileId: string;
  displayName: string;
  price25Cents: number | null;
  price50Cents: number | null;
  breaches: ('price25' | 'price50')[];
}
export interface SettingsSnapshot { settings: SettingsView; outOfBounds: { total: number; mentors: FlaggedMentor[] } }

const amount = (cents: number) => (cents / 100).toFixed(2);
const price = (cents: number | null) => (cents == null ? 'Not set' : `PLN ${amount(cents)}`);
const BREACH_LABEL = { price25: '25-minute price', price50: '50-minute price' } as const;

/**
 * The operator's bounds-and-fee form plus the mentors those bounds flag. The form carries the
 * version it was loaded with, so a save that crossed another operator's save is refused (409)
 * and this draft stays on screen. A successful save refreshes the flagged list in place.
 */
export function PlatformSettingsForm({ initial }: { initial: SettingsSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [saved, setSaved] = useState(false);
  const { settings, outOfBounds } = snapshot;
  // CrudForm sends the schema's output: the shared field rules plus the loaded version.
  const schema = useMemo(() => platformSettingsFieldsSchema.transform(fields => ({ ...fields, version: settings.version })), [settings.version]);
  const { p25, p50 } = settings.priceBounds;

  return <>
    <Card className="dm-product-panel">
      <div>
        <h2>Bounds and fee</h2>
        <p className="dm-product-muted">{`Mentors set prices within these inclusive bounds from their next save. The fee applies to later paid sessions. Currency: ${settings.currency}.`}</p>
      </div>
      <CrudForm schema={schema} endpoint="/api/operator/settings" method="PUT" submitLabel="Save settings" fields={[
        { name: 'price25Min', label: '25-minute minimum (PLN)', type: 'money', required: true },
        { name: 'price25Max', label: '25-minute maximum (PLN)', type: 'money', required: true },
        { name: 'price50Min', label: '50-minute minimum (PLN)', type: 'money', required: true },
        { name: 'price50Max', label: '50-minute maximum (PLN)', type: 'money', required: true },
        { name: 'feePercent', label: 'Platform fee (%)', type: 'number', required: true, description: 'A whole percent from 0 to 100. The default is 20%.' },
      ]} initialValues={{
        price25Min: amount(p25.minCents), price25Max: amount(p25.maxCents),
        price50Min: amount(p50.minCents), price50Max: amount(p50.maxCents),
        feePercent: settings.feePercent,
      }} onSubmittingChange={submitting => { if (submitting) setSaved(false); }}
      onSuccess={data => { setSnapshot(data as SettingsSnapshot); setSaved(true); }} />
      {saved && <p role="status" className="dm-product-callout">The settings were saved.</p>}
      <p className="dm-product-caption">
        {settings.updatedAt && settings.updatedBy
          ? <>{`Last changed by ${settings.updatedBy.displayName} on `}<LocalTime value={settings.updatedAt} /></>
          : 'Using the default values. Nobody has changed them here yet.'}
      </p>
    </Card>
    <Card className="dm-product-panel min-w-0 overflow-x-auto">
      <div>
        <h2>Prices outside the bounds</h2>
        <p className="dm-product-muted">These prices are not changed. These mentors cannot be booked until they set prices within the bounds.</p>
      </div>
      {outOfBounds.total === 0 ? <EmptyState title="Every mentor's prices are within the bounds" description="Mentors appear here when a price falls outside the bounds above." /> : <>
        <table className="w-full text-left">
          <caption className="sr-only">Mentors with a price outside the bounds</caption>
          <thead><tr><th scope="col">Mentor</th><th scope="col">25 min</th><th scope="col">50 min</th><th scope="col">Outside the bounds</th></tr></thead>
          <tbody>{outOfBounds.mentors.map(mentor => <tr key={mentor.mentorProfileId}>
            <th scope="row" className="py-2 font-normal">{mentor.displayName}</th>
            <td>{price(mentor.price25Cents)}</td>
            <td>{price(mentor.price50Cents)}</td>
            <td>{mentor.breaches.map(breach => BREACH_LABEL[breach]).join(', ')}</td>
          </tr>)}</tbody>
        </table>
        {outOfBounds.total > outOfBounds.mentors.length && <p className="dm-product-caption">{`Showing ${outOfBounds.mentors.length} of ${outOfBounds.total} mentors.`}</p>}
      </>}
    </Card>
  </>;
}
