'use client';
import { useState } from 'react';
import { mentorPricesUpdateSchema } from '@devmentor/core/validators/mentors/mentor-prices-update.schema';
import { CrudForm } from '@devmentor/ui/backend';
import { Badge } from '@devmentor/ui/components/badge';
import { Card } from '@devmentor/ui/components/card';

interface Bounds { minCents: number; maxCents: number }
export interface MentorPriceData {
  prices: { price25Cents: number; price50Cents: number; currency: string } | null;
  priceBounds: { p25: Bounds; p50: Bounds };
}

const major = (cents: number) => (cents / 100).toLocaleString('en-GB', { maximumFractionDigits: 2 });
const range = (bounds: Bounds) => `PLN ${major(bounds.minCents)}–${major(bounds.maxCents)}`;

/** The workspace's price card: both prices save together within the server's bounds. */
export function MentorPrices({ profile, onSaved }: { profile: MentorPriceData; onSaved: () => void }) {
  const [saved, setSaved] = useState(false);
  const { p25, p50 } = profile.priceBounds;
  return <Card className="dm-product-panel" id="mentor-prices">
    <div><h2>Session prices</h2><p className="dm-product-muted">Both prices are required before anyone can book.</p></div>
    <div className="dm-fact-chips" aria-label="Allowed session prices">
      <Badge variant="outline">{`25 min: ${range(p25)}`}</Badge>
      <Badge variant="outline">{`50 min: ${range(p50)}`}</Badge>
    </div>
    <CrudForm schema={mentorPricesUpdateSchema} endpoint="/api/mentors/me/prices" method="PUT" submitLabel="Save prices" fields={[
      { name: 'price25', label: '25-minute price (PLN)', type: 'money', required: true, description: 'Use up to two decimal places.' },
      { name: 'price50', label: '50-minute price (PLN)', type: 'money', required: true, description: 'Use up to two decimal places.' },
    ]} initialValues={{
      price25: profile.prices ? (profile.prices.price25Cents / 100).toFixed(2) : '',
      price50: profile.prices ? (profile.prices.price50Cents / 100).toFixed(2) : '',
    }} onSuccess={() => { setSaved(true); onSaved(); }} />
    {saved && <p role="status" className="dm-product-callout">Both session prices were saved.</p>}
  </Card>;
}
