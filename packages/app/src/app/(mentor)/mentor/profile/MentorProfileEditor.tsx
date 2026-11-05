'use client';
import { useState } from 'react';
// The validators subpath only: the `@devmentor/core` barrel would pull the database into the browser.
import { mentorProfileUpdateSchema } from '@devmentor/core/validators/mentors/mentor-profile-update.schema';
import {
  apiCall,
  CrudForm,
  ErrorMessage,
  ReadinessChecklist,
  ResourcePanel,
  useApiResource,
  type FieldErrors,
  type ReadinessItem,
} from '@devmentor/ui/backend';
import { Button } from '@devmentor/ui/components/button';
import { MentorPageView, type MentorPageData } from '@devmentor/ui/components/mentors/MentorPageView';
interface OwnerProfile extends MentorPageData {
  id: string;
  publishedAt: string | null;
  readiness: { ready: boolean; items: ReadinessItem[] };
}
export function MentorProfileEditor({
  appUrl,
  options,
}: {
  appUrl: string;
  options: { value: string; label: string }[];
}) {
  const resource = useApiResource<OwnerProfile>('/api/mentors/me');
  const labels = new Map(options.map((option) => [option.value, option.label]));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  async function transition(action: 'publish' | 'unpublish') {
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      const result = await apiCall(`/api/mentors/me/${action}`, { method: 'POST' });
      if (result.ok) resource.reload();
      else {
        setError(result.error.message);
        setFieldErrors(result.error.fieldErrors ?? {});
      }
    } catch {
      setError('We could not save this change. Please try again.');
    } finally {
      setPending(false);
    }
  }
  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopyStatus('Share link copied.');
    } catch {
      setCopyStatus('Could not copy the link. Select and copy the link above.');
    }
  }
  return (
    <ResourcePanel resource={resource}>
      {(profile) => (
        <div className="flex max-w-[65ch] flex-col gap-8">
          <div>
            <h1 className="text-2xl font-medium">Your mentor profile</h1>
            <p className="mt-2 text-muted-foreground">
              Save your work as you go, then publish when your page is ready.
            </p>
          </div>
          <CrudForm
            schema={mentorProfileUpdateSchema}
            endpoint="/api/mentors/me"
            method="PUT"
            fields={[
              {
                name: 'publicWorkUrl',
                label: 'Link to public work',
                omitEmpty: true,
                description: 'A public GitHub profile, project or article. Use an http or https URL.',
              },
              { name: 'bio', label: 'About your experience', type: 'textarea', omitEmpty: true },
              { name: 'stackTags', label: 'Technology stacks', type: 'multiselect', options },
            ]}
            initialValues={{
              publicWorkUrl: profile.publicWorkUrl ?? '',
              bio: profile.bio ?? '',
              stackTags: profile.stackTags,
            }}
            externalFieldErrors={fieldErrors}
            submitLabel="Save profile"
            onSubmittingChange={setPending}
            onSuccess={() => {
              setError(null);
              setFieldErrors({});
              resource.reload();
            }}
          />
          <ReadinessChecklist items={profile.readiness.items} />
          {error && <ErrorMessage message={error} />}
          <div className="dm-form-actions">
            <Button
              disabled={pending}
              // Unpublishing is the secondary, reversible action on a live page.
              {...(profile.publishedAt ? { intent: 'neutral', appearance: 'stroke' } : {})}
              onClick={() => void transition(profile.publishedAt ? 'unpublish' : 'publish')}
            >
              {pending ? 'Saving…' : profile.publishedAt ? 'Unpublish page' : 'Publish page'}
            </Button>
          </div>
          {profile.slug && (
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Your share link</h2>
              <a className="block break-all underline" href={`${appUrl}/m/${profile.slug}`}>
                {appUrl}/m/{profile.slug}
              </a>
              <p>Your share link stays the same if you change your name or unpublish and republish.</p>
              <Button
                intent="neutral"
                appearance="stroke"
                onClick={() => void copy(`${appUrl}/m/${profile.slug}`)}
              >
                Copy share link
              </Button>
              {copyStatus && <p role="status">{copyStatus}</p>}
            </section>
          )}
          <section aria-label="Profile preview">
            <h2 className="text-lg font-medium">Preview</h2>
            <MentorPageView
              profile={{ ...profile, stackTags: profile.stackTags.map((tag) => labels.get(tag) ?? tag) }}
            />
          </section>
        </div>
      )}
    </ResourcePanel>
  );
}
