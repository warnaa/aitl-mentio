'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Check, Circle, Copy, ExternalLink, Link2 } from 'lucide-react';
import { z } from 'zod';
// The validators subpath only: the `@devmentor/core` barrel would pull the database into the browser.
import { mentorProfileUpdateSchema } from '@devmentor/core/validators/mentors/mentor-profile-update.schema';
import { apiCall, ErrorMessage, ResourcePanel, useApiResource, type FieldErrors, type ReadinessItem } from '@devmentor/ui/backend';
import { Badge } from '@devmentor/ui/components/badge';
import { Button } from '@devmentor/ui/components/button';
import { Card } from '@devmentor/ui/components/card';
import { MentorPageView, type MentorPageData } from '@devmentor/ui/components/mentors/MentorPageView';
import {
  MentorProfileEditor,
  mentorProfileMessages,
  publicWorkUrlSchema,
} from '@devmentor/ui/components/mentors/MentorProfileEditor';
import { navigation } from '../../../../lib/navigation';

interface OwnerProfile extends MentorPageData {
  id: string;
  publishedAt: string | null;
  readiness: { ready: boolean; items: ReadinessItem[] };
}
type Options = { value: string; label: string }[];

/**
 * Drafts save partially (mentor-page spec): an empty field is left out of the request,
 * a filled one gets the editor's own messages, and the result is the API's schema.
 */
export const draftSchema = z
  .object({
    publicWorkUrl: z
      .string()
      .trim()
      .refine((url) => url === '' || publicWorkUrlSchema.safeParse(url).success, mentorProfileMessages.publicWorkUrl),
    bio: z.string().trim().max(2000, mentorProfileMessages.bioLength),
    stackTags: z.array(z.string()),
  })
  .transform(
    ({ publicWorkUrl, bio, stackTags }): z.input<typeof mentorProfileUpdateSchema> => ({
      publicWorkUrl: publicWorkUrl || undefined,
      bio: bio || undefined,
      // The API schema checks the vocabulary.
      stackTags: stackTags as z.input<typeof mentorProfileUpdateSchema>['stackTags'],
    }),
  )
  .pipe(mentorProfileUpdateSchema);

/** `/mentor/profile`, composed as the prototype's mentor profile editor (s27). */
export function MentorProfileWorkspace({ appUrl, options }: { appUrl: string; options: Options }) {
  const resource = useApiResource<OwnerProfile>('/api/mentors/me');
  const labels = new Map(options.map((option) => [option.value, option.label]));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [revision, setRevision] = useState(0);
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [previewing, setPreviewing] = useState(false);
  async function transition(action: 'publish' | 'unpublish') {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const result = await apiCall(`/api/mentors/me/${action}`, { method: 'POST' });
      if (result.ok) {
        setSaved(false);
        setPreviewing(false);
        resource.reload();
      } else {
        setError(result.error.message);
        setFieldErrors(result.error.fieldErrors ?? {});
      }
    } catch {
      setError('We could not save this change. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopy('copied');
    } catch {
      setCopy('failed');
    }
  }
  return (
    <ResourcePanel resource={resource}>
      {(profile) => {
        const published = profile.publishedAt !== null;
        const shareLink = profile.slug ? `${appUrl}/m/${profile.slug}` : null;
        return (
          <div className="dm-mentor-workspace">
            <header className="dm-mentor-workspace-heading">
              <div>
                <span className="dm-product-eyebrow">Your public profile</span>
                <h1>Show mentees how you can help</h1>
                <p>
                  Describe your work and the problems you know well. Your public work gives mentees an example to look
                  at.
                </p>
              </div>
              <Badge variant="outline">{published ? 'Published' : 'Draft'}</Badge>
            </header>
            <div className="dm-mentor-workspace-editor-grid">
              <Card className="dm-product-panel">
                <div
                  onChange={() => {
                    setDirty(true);
                    setSaved(false);
                  }}
                >
                  <MentorProfileEditor
                    key={revision}
                    endpoint="/api/mentors/me"
                    schema={draftSchema}
                    stackOptions={options}
                    initialValues={{
                      publicWorkUrl: profile.publicWorkUrl ?? '',
                      bio: profile.bio ?? '',
                      stackTags: profile.stackTags,
                    }}
                    externalFieldErrors={fieldErrors}
                    onSubmittingChange={setSaving}
                    onSaved={() => {
                      setSaved(true);
                      setDirty(false);
                      setError(null);
                      setFieldErrors({});
                      setCopy('idle');
                      resource.reload();
                    }}
                    onCancel={() => {
                      setRevision((value) => value + 1);
                      setDirty(false);
                      setSaved(false);
                      navigation.assign('/mentor');
                    }}
                  />
                </div>
                {saved && (
                  <p role="status" className="dm-product-callout">
                    Profile saved.{published ? ' Your public page is updated.' : ' Publish it when you are ready.'}
                  </p>
                )}
              </Card>
              <aside className="dm-mentor-workspace-aside">
                <Card className="dm-product-panel">
                  <Link2 aria-hidden="true" />
                  <h2>{published ? 'Share your profile' : 'Publish when you are ready'}</h2>
                  <p className="dm-product-muted">
                    {published
                      ? 'Your share link stays the same if you change your name or unpublish and republish.'
                      : 'Your profile stays private until you publish it. A public-work link, description and at least one technology are required.'}
                  </p>
                  {!published && (
                    <ul className="dm-mentor-workspace-checklist" aria-label="Before you publish">
                      {profile.readiness.items.map((item) => (
                        <li key={item.key} data-met={item.met}>
                          {item.met ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
                          <span>
                            {item.met ? 'Complete: ' : 'Required: '}
                            {item.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {error && <ErrorMessage message={error} />}
                  <div className="dm-mentor-workspace-aside-actions">
                    {dirty && <p role="status">Save your changes before publishing or previewing the saved page.</p>}
                    {!published && (
                      <Button disabled={busy || saving || dirty} onClick={() => void transition('publish')}>
                        {busy ? 'Publishing…' : 'Publish profile'}
                      </Button>
                    )}
                    {published && profile.slug ? (
                      <Button asChild intent="neutral" appearance="stroke">
                        <Link href={`/m/${profile.slug}`}>
                          Preview public page
                          <ExternalLink aria-hidden="true" />
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        intent="neutral"
                        appearance="stroke"
                        disabled={busy || saving}
                        aria-expanded={previewing}
                        aria-controls="mentor-profile-preview"
                        onClick={() => setPreviewing((value) => !value)}
                      >
                        {previewing ? 'Hide preview' : 'Preview public page'}
                      </Button>
                    )}
                    {published && shareLink && (
                      <>
                        <label className="dm-field">
                          Share link
                          <input className="dm-input" readOnly value={shareLink} onFocus={(event) => event.currentTarget.select()} />
                        </label>
                        <Button intent="neutral" appearance="stroke" onClick={() => void copyLink(shareLink)}>
                          <Copy aria-hidden="true" />
                          Copy profile link
                        </Button>
                        {copy === 'copied' && <p role="status">Link copied.</p>}
                        {copy === 'failed' && (
                          <ErrorMessage message="The link could not be copied. Select the link above and copy it manually." />
                        )}
                        <Button intent="neutral" appearance="ghost" disabled={busy} onClick={() => void transition('unpublish')}>
                          {busy ? 'Unpublishing…' : 'Unpublish page'}
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
                <p className="dm-product-caption">Session prices and availability are managed from your mentor workspace.</p>
              </aside>
            </div>
            {previewing && (
              <section id="mentor-profile-preview" className="dm-mentor-workspace-preview" aria-labelledby="mentor-preview-title">
                <div>
                  <h2 id="mentor-preview-title">Preview of your public page</h2>
                  <p className="dm-product-muted">Visitors cannot open this page until you publish it.</p>
                </div>
                <MentorPageView
                  profile={{ ...profile, stackTags: profile.stackTags.map((tag) => labels.get(tag) ?? tag) }}
                />
              </section>
            )}
          </div>
        );
      }}
    </ResourcePanel>
  );
}
