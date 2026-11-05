'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ResourcePanel, useApiResource } from '@devmentor/ui/backend';
import { Button } from '@devmentor/ui/components/button';
import { Card } from '@devmentor/ui/components/card';
import { MentorOnboarding } from '@devmentor/ui/components/mentors/MentorOnboarding';
import { AddTimeCard, TimesCard, useMentorSlots } from './MentorAvailability';
import { MentorPrices, type MentorPriceData } from './MentorPrices';

interface ReadinessItem { key: string; met: boolean }
export interface MentorWorkspaceData extends MentorPriceData {
  slug: string | null;
  publishedAt: string | null;
  initialPublishDueAt: string | null;
  offerReadiness: { ready: boolean; items: ReadinessItem[] };
}

const met = (data: MentorWorkspaceData, ...keys: string[]) =>
  keys.every(key => data.offerReadiness.items.some(item => item.key === key && item.met));
const dueLabel = (value: string) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date(value));

/** `/mentor`, composed as the prototype's mentor workspace (s11). Readiness comes from the server. */
export function MentorWorkspace() {
  const resource = useApiResource<MentorWorkspaceData>('/api/mentors/me');
  const slots = useMentorSlots();
  const refresh = () => { resource.reload(); slots.resource.reload(); };
  const ready = resource.data?.offerReadiness.ready;
  // The heading renders before (and without) the profile, so the page is never untitled.
  return <div className="dm-mentor-workspace">
    <header className="dm-mentor-workspace-heading">
      {resource.data ? <div>
        <span className="dm-page-eyebrow">Mentor workspace</span>
        <h1>{ready ? 'Your mentor workspace' : 'Get ready for your first session'}</h1>
        <p>{ready ? 'Manage your public profile, session prices and availability.' : 'Complete your profile, set both prices and publish a time so a mentee can book you.'}</p>
      </div> : <div><h1>Mentor workspace</h1></div>}
      <Button asChild intent="neutral" appearance="stroke"><Link href="/mentor/profile">Edit profile</Link></Button>
    </header>
    <ResourcePanel resource={resource}>{data => {
      const profileDone = met(data, 'profile', 'published');
      const pricesDone = met(data, 'price25', 'price50');
      const timeDone = met(data, 'availability');
      return <>
        <MentorOnboarding dueDateLabel={data.initialPublishDueAt ? dueLabel(data.initialPublishDueAt) : undefined} steps={[
          { id: 'profile', title: 'Publish your mentor profile', description: 'Add your public work, a description and your technologies.', complete: profileDone,
            action: <Button asChild intent="neutral" appearance="stroke" size="sm"><Link href="/mentor/profile">{profileDone ? 'Edit profile' : 'Complete profile'}</Link></Button> },
          { id: 'prices', title: 'Set your session prices', description: 'Choose a price for 25 minutes and 50 minutes.', complete: pricesDone,
            action: <a className="dm-mentor-workspace-link" href="#mentor-prices">Set prices</a> },
          { id: 'time', title: 'Publish an available time', description: 'Choose a future start time for your first session.', complete: timeDone,
            action: <a className="dm-mentor-workspace-link" href="#mentor-time">Add time</a> },
        ]} />
        <div className="dm-mentor-workspace-grid">
          <MentorPrices profile={data} onSaved={resource.reload} />
          <AddTimeCard onPublished={refresh} />
        </div>
        <TimesCard slots={slots} onRemoved={refresh} />
        <Card className="dm-product-panel dm-mentor-workspace-footer">
          <div>
            <h2>{ready ? 'Your profile is ready to share' : 'Your public profile'}</h2>
            <p className="dm-product-muted">{data.publishedAt ? 'Check what mentees see, including your current prices and availability.' : 'Publish your profile before sharing it with mentees.'}</p>
          </div>
          <div className="dm-form-actions">
            {data.publishedAt && data.slug
              ? <Button asChild><Link href={`/m/${data.slug}`}>View public profile<ArrowRight aria-hidden="true" /></Link></Button>
              : <Button asChild><Link href="/mentor/profile">Complete profile</Link></Button>}
          </div>
        </Card>
      </>;
    }}</ResourcePanel>
  </div>;
}
