'use client';
import Link from 'next/link';
import { ReadinessChecklist, ResourcePanel, useApiResource, type ReadinessItem } from '@devmentor/ui/backend';
interface OfferStatus { offerReadiness: { ready: boolean; items: ReadinessItem[] } }
export function MentorOfferStatus() {
  const resource = useApiResource<OfferStatus>('/api/mentors/me');
  return <ResourcePanel resource={resource}>{profile => <div className="space-y-6">
    <ReadinessChecklist title="Prepare your mentor offer" items={profile.offerReadiness.items} actionsByKey={{
      profile: <Link className="ml-2 underline" href="/mentor/profile">Edit profile</Link>,
      published: <Link className="ml-2 underline" href="/mentor/profile">Publish page</Link>,
      price25: <Link className="ml-2 underline" href="/mentor/prices">Set prices</Link>,
      price50: <Link className="ml-2 underline" href="/mentor/prices">Set prices</Link>,
      availability: <Link className="ml-2 underline" href="/mentor/slots">Publish a time</Link>,
    }} />
    {profile.offerReadiness.ready && <p role="status">Your profile, prices and availability are ready. Booking and payments are separate launch capabilities.</p>}
  </div>}</ResourcePanel>;
}
