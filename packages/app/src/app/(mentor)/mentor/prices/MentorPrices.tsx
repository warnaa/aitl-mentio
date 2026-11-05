'use client';
import { useState } from 'react';
import { mentorPricesUpdateSchema } from '@devmentor/core/validators/mentors/mentor-prices-update.schema';
import { CrudForm, ResourcePanel, useApiResource } from '@devmentor/ui/backend';
interface PriceData {
  prices: { price25Cents: number; price50Cents: number; currency: string } | null;
  priceBounds: { p25: { minCents: number; maxCents: number }; p50: { minCents: number; maxCents: number } };
}
export function MentorPrices() {
  const resource = useApiResource<PriceData>('/api/mentors/me');
  const [saved, setSaved] = useState(false);
  return <ResourcePanel resource={resource}>{profile => <main className="max-w-[65ch] space-y-8">
    <header><h1 className="text-2xl font-medium">Session prices</h1><p className="mt-2 text-muted-foreground">Set both session prices in PLN. Your prices save together.</p></header>
    <CrudForm schema={mentorPricesUpdateSchema} endpoint="/api/mentors/me/prices" method="PUT" submitLabel="Save prices" fields={[
      { name: 'price25', label: '25-minute price', type: 'money', required: true, description: `PLN ${(profile.priceBounds.p25.minCents / 100).toFixed(2)}–${(profile.priceBounds.p25.maxCents / 100).toFixed(2)}. Use up to two decimal places.` },
      { name: 'price50', label: '50-minute price', type: 'money', required: true, description: `PLN ${(profile.priceBounds.p50.minCents / 100).toFixed(2)}–${(profile.priceBounds.p50.maxCents / 100).toFixed(2)}. Use up to two decimal places.` },
    ]} initialValues={{ price25: profile.prices ? (profile.prices.price25Cents / 100).toFixed(2) : '', price50: profile.prices ? (profile.prices.price50Cents / 100).toFixed(2) : '' }} onSuccess={() => { setSaved(true); resource.reload(); }} />
    {saved && <p role="status">Both session prices were saved.</p>}
  </main>}</ResourcePanel>;
}
