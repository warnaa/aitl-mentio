import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { z } from 'zod';
import { AccountNav } from '@mentio/ui/components/auth/AccountNav';
import { MentorDirectory } from '@mentio/ui/components/mentors/MentorDirectory';
import { MentorProfile } from '@mentio/ui/components/mentors/MentorProfile';
import { MentorPageStatus } from '@mentio/ui/components/mentors/MentorPageStatus';
import { PanelShell } from '@mentio/ui/backend/layout';
import { ActionButton } from '@mentio/ui/backend/actions';
import { CrudForm } from '@mentio/ui/backend/forms';
import { DataTable } from '@mentio/ui/backend/tables';
import { EmptyState, StatusBadge, type StatusTone } from '@mentio/ui/backend/feedback';
import { apiCall, type FieldErrors } from '@mentio/ui/backend/api';
import { Button } from '@mentio/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mentio/ui/components/card';
import { directoryItems, longDirectoryItem, profile } from '../../fixtures/mentors';

// E01 screens (mentor-pages UI/UX): `/mentorzy`, `/mentorzy/<slug>`, `/mentor/strona`, `/mentor/terminy`.
// Reference compositions of package components; the app's pages wire the same props to loaders.
const publicNav = <AccountNav brand={{ href: '#/', label: 'Mentio' }} navLabel="Account" signedIn={false} signIn={{ href: '#/logowanie', label: 'Sign in' }} signUp={{ href: '#/rejestracja', label: 'Create account' }} />;
const Public = ({ children }: { children: ReactNode }) => <div className="min-h-dvh bg-background text-foreground">{publicNav}<main>{children}</main></div>;
const Mentor = ({ current, children }: { current: string; children: ReactNode }) => <PanelShell title="Mentio — mentor" homeHref="#/mentor/strona" navLabel="Mentor" skipLabel="Skip to content" currentHref={current}
  items={[{ href: '#/mentor/strona', label: 'My page' }, { href: '#/mentor/terminy', label: 'My slots' }]} actions={<Button type="button" variant="ghost" size="sm">Sign out</Button>}>{children}</PanelShell>;

// ---- My page (`/mentor/strona`) ----
const editorSchema = z.object({
  slug: z.string({ error: 'Enter a page address' }).regex(/^[a-z0-9-]{3,60}$/, { message: 'Use 3–60 lowercase letters, digits or hyphens' }),
  displayName: z.string({ error: 'Enter the name mentees will see' }).trim().min(1).max(80, { message: 'Use at most 80 characters' }),
  description: z.string().trim().max(5000).optional(),
  publicWorkLinks: z.array(z.string()).transform(rows => rows.filter(Boolean)).pipe(z.array(z.url({ message: 'Enter a full address starting with https://' })).max(5, { message: 'Add at most 5 links' })),
});
const rateSchema = z.object({ ratePln: z.coerce.number({ message: 'Enter a whole amount in zł' }).int({ message: 'Enter a whole amount in zł' }).min(90, { message: 'The rate must be from 90 zł to 600 zł' }).max(600, { message: 'The rate must be from 90 zł to 600 zł' }) });
const listingSchema = z.object({ isListed: z.boolean() });
type Initial = { slug?: string; displayName?: string; description?: string; publicWorkLinks?: string[]; ratePln?: number | null; isListed?: boolean };

function MyPageScreen({ published = false, initial = {} }: { published?: boolean; initial?: Initial }) {
  const [isPublished, setPublished] = useState(published);
  const [dirty, setDirty] = useState(false);
  const [external, setExternal] = useState<FieldErrors | undefined>();
  const action = isPublished
    ? <ActionButton label="Unpublish page" variant="outline" pendingLabel="Unpublishing…" run={() => apiCall('/api/mentors/me/page/unpublish', { method: 'POST' })} onSuccess={() => setPublished(false)} />
    : <ActionButton label="Publish page" pendingLabel="Publishing…" run={() => apiCall('/api/mentors/me/page/publish', { method: 'POST' })}
        disabled={dirty} disabledReason={dirty ? 'Save your changes before publishing.' : undefined}
        onError={error => setExternal(error.fieldErrors)} onSuccess={() => { setPublished(true); setExternal(undefined); }} />;
  return <Mentor current="#/mentor/strona"><div className="flex flex-col gap-section">
    <h1 className="mentio-public-title">My page</h1>
    <MentorPageStatus heading="Your page" statusLabel={isPublished ? 'Published' : 'Draft'} statusTone={isPublished ? 'success' : 'neutral'} shareLabel="Share link" shareUrl={`https://mentio.example/mentorzy/${initial.slug ?? 'alex'}`}
      copyLabel="Copy link" copiedLabel="Copied" copyFailedLabel="Select the link and copy it manually" view={isPublished ? { href: `#/mentorzy/${initial.slug ?? 'alex'}`, label: 'View page' } : undefined} action={action} />
    <Card><CardHeader><CardTitle><h2>Page content</h2></CardTitle><CardDescription>Mentees see this on your public page.</CardDescription></CardHeader><CardContent>
      <CrudForm schema={editorSchema} submitLabel="Save changes" externalFieldErrors={external} onDirtyChange={next => { setDirty(next); if (next) setExternal(undefined); }}
        initialValues={{ slug: initial.slug, displayName: initial.displayName, description: initial.description, publicWorkLinks: initial.publicWorkLinks }}
        onSubmit={values => apiCall('/api/mentors/me/page', { method: 'PUT', body: values })} onSuccess={() => setExternal(undefined)}
        fields={[
          { name: 'slug', label: 'Page address', description: isPublished ? 'mentio.example/mentorzy/… — changing it breaks the old link.' : 'mentio.example/mentorzy/… — lowercase letters, digits and hyphens.' },
          { name: 'displayName', label: 'Display name' },
          { name: 'description', label: 'Description', type: 'textarea', description: 'Plain text. What you help with and how you work.' },
          { name: 'publicWorkLinks', label: 'Public work', type: 'urlList', max: 5, description: 'Up to 5 links. At least one is needed to publish.' },
        ]} />
    </CardContent></Card>
    <Card><CardHeader><CardTitle><h2>Rate</h2></CardTitle></CardHeader><CardContent>
      <CrudForm schema={rateSchema} submitLabel="Save rate" initialValues={{ ratePln: initial.ratePln ?? null }} onSubmit={values => apiCall('/api/mentors/me/page/rate', { method: 'PUT', body: values })}
        fields={[{ name: 'ratePln', label: 'Rate per 25 minutes', type: 'money', description: '50 minutes costs twice the rate.' }]} />
    </CardContent></Card>
    <Card><CardHeader><CardTitle><h2>Mentor list</h2></CardTitle></CardHeader><CardContent>
      <CrudForm schema={listingSchema} submitLabel="Save listing" initialValues={{ isListed: initial.isListed ?? false }} onSubmit={values => apiCall('/api/mentors/me/page/listing', { method: 'PUT', body: values })}
        fields={[{ name: 'isListed', label: 'Show me in the mentor list', type: 'checkbox', description: 'Your page stays reachable through its share link either way.' }]} />
    </CardContent></Card>
  </div></Mentor>;
}
const savedDraft: Initial = { slug: 'alex', displayName: 'Alex', description: profile.description, publicWorkLinks: [] };
const publishedPage: Initial = { slug: 'alex', displayName: 'Alex', description: profile.description, publicWorkLinks: profile.work.links, ratePln: 120, isListed: true };

// ---- My slots (`/mentor/terminy`) ----
interface SlotRow { id: string; label: string; status: string; tone: StatusTone }
const slotRows: SlotRow[] = [
  { id: 's1', label: 'Thursday, 6 November, 18:00', status: 'Visible — can be booked', tone: 'success' },
  { id: 's2', label: 'Friday, 7 November, 09:30', status: 'Visible — no rate', tone: 'waiting' },
  { id: 's3', label: 'Monday, 24 November, 17:00', status: 'Outside the booking window', tone: 'neutral' },
  { id: 's4', label: 'Tuesday, 25 November, 08:00', status: 'Page not published', tone: 'neutral' },
];
const slotSchema = z.object({ startsAt: z.string({ error: 'Choose a date and time' }).regex(/^\d{4}-\d{2}-\d{2}T\d{2}:(00|15|30|45)$/, { message: 'Choose a quarter hour, for example 18:00 or 18:15' }) });

function MySlotsScreen({ rows: initialRows = slotRows, hasPage = true }: { rows?: SlotRow[]; hasPage?: boolean }) {
  const [rows, setRows] = useState(initialRows);
  if (!hasPage) return <Mentor current="#/mentor/terminy"><h1 className="mentio-public-title">My slots</h1>
    <EmptyState title="Create your page first" description="Slots appear on your mentor page, so it needs to exist before you add them." action={<Button asChild><a href="#/mentor/strona">Go to my page</a></Button>} /></Mentor>;
  return <Mentor current="#/mentor/terminy"><div className="flex flex-col gap-section">
    <h1 className="mentio-public-title">My slots</h1>
    <Card><CardHeader><CardTitle><h2>Add a slot</h2></CardTitle><CardDescription>Slots are at least one hour apart; each one reserves 50 minutes.</CardDescription></CardHeader><CardContent>
      <CrudForm schema={slotSchema} submitLabel="Add slot" onSubmit={values => apiCall('/api/availability/slots', { method: 'POST', body: values })}
        onSuccess={() => setRows(current => [...current, { id: `n${current.length}`, label: 'Wednesday, 12 November, 18:00', status: 'Visible — can be booked', tone: 'success' }])}
        fields={[{ name: 'startsAt', label: 'Session start, Warsaw time', type: 'datetime' }]} />
    </CardContent></Card>
    <section aria-labelledby="upcoming-slots" className="flex flex-col gap-within-group">
      <h2 id="upcoming-slots" className="mentio-public-heading">Upcoming slots</h2>
      <DataTable rows={rows} getRowId={row => row.id} emptyTitle="You have no published slots" emptyDescription="Add a time when you can take a text session."
        columns={[{ id: 'time', header: 'Start (Warsaw time)', className: 'tabular-nums', cell: row => row.label }, { id: 'status', header: 'Status', cell: row => <StatusBadge tone={row.tone} label={row.status} /> }]}
        rowActions={row => <ActionButton label="Remove slot" size="sm" variant="ghost" pendingLabel="Removing…" run={() => apiCall('/api/availability/slots', { method: 'DELETE', query: { id: row.id } })}
          confirm={{ title: `Remove the slot on ${row.label}?`, description: 'Mentees will no longer see this time on your page.', confirmLabel: 'Remove slot', cancelLabel: 'Keep slot' }}
          onSuccess={() => setRows(current => current.filter(item => item.id !== row.id))} />} />
    </section>
  </div></Mentor>;
}

const ok = (status = 200, data: JsonBodyType = {}) => HttpResponse.json({ ok: true, data }, { status });
const meta = {
  title: 'Product/E01 — Mentor page and discovery/Screens',
  parameters: { layout: 'fullscreen', msw: { handlers: [
    http.post('/api/mentors/me/page/:action', () => ok()), http.put('/api/mentors/me/page', () => ok()), http.put('/api/mentors/me/page/:part', () => ok()),
    http.post('/api/availability/slots', () => ok(201, { id: 'n1', startsAt: '2026-11-12T17:00:00.000Z' })), http.delete('/api/availability/slots', () => ok(200, { id: 's1' })),
  ] } },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const pagination = { navLabel: 'Mentor list pages', label: 'Page 2 of 3', previousHref: '#/mentorzy?strona=1', nextHref: '#/mentorzy?strona=3', previousLabel: 'Previous page', nextLabel: 'Next page' };
export const MentorList: Story = { name: 'Mentor list — results', render: () => <Public><MentorDirectory heading="Mentors" items={directoryItems} emptyText="There are no mentors on the list yet." /></Public> };
export const MentorListPaginated: Story = { name: 'Mentor list — page 2 of 3', render: () => <Public><MentorDirectory heading="Mentors" items={directoryItems} emptyText="" pagination={pagination} /></Public> };
export const MentorListEmpty: Story = { name: 'Mentor list — empty', render: () => <Public><MentorDirectory heading="Mentors" items={[]} emptyText="There are no mentors on the list yet." /></Public> };
export const MentorListNarrow: Story = { name: 'Mentor list — narrow, long content', render: () => <Public><MentorDirectory heading="Mentors" items={[longDirectoryItem, ...directoryItems]} emptyText="" pagination={pagination} /></Public>, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const MentorPage: Story = { name: 'Mentor page — priced, with slots', render: () => <Public><MentorProfile {...profile} /></Public> };
export const MentorPageNoRate: Story = { name: 'Mentor page — no rate (booking unavailable)', render: () => <Public><MentorProfile {...profile} prices={{ ...profile.prices, items: null }} /></Public> };
export const MentorPageNoSlots: Story = { name: 'Mentor page — no slots', render: () => <Public><MentorProfile {...profile} slots={{ ...profile.slots, days: [] }} /></Public> };
export const MentorPageNarrow: Story = { name: 'Mentor page — narrow', render: () => <Public><MentorProfile {...profile} work={{ ...profile.work, links: ['https://example.test/aleksandra-wisniewska-kowalczyk/a-very-long-repository-name-about-ingress-controllers/blob/main/docs/upgrade-notes.md', ...profile.work.links] }} /></Public>, globals: { viewport: { value: 'mobile1', isRotated: false } } };

export const MyPageSavedDraft: Story = { name: 'My page — saved draft, no public work yet', render: () => <MyPageScreen initial={savedDraft} /> };
export const MyPagePublishRefused: Story = {
  name: 'My page — publish refused (missing link)', render: () => <MyPageScreen initial={savedDraft} />,
  parameters: { msw: { handlers: [http.post('/api/mentors/me/page/publish', () => HttpResponse.json({ ok: false, error: { code: 'validation_error', message: 'Add the missing content before publishing.', fieldErrors: { publicWorkLinks: ['Add at least one link to your public work'] } } }, { status: 400 }))] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Publish page' }));
    await expect(await canvas.findByText('Add at least one link to your public work')).toBeInTheDocument();
    await expect(canvas.getByRole('alert')).toHaveTextContent('Add the missing content before publishing.');
    await expect(canvas.getByText('Draft')).toBeInTheDocument();
  },
};
export const MyPageDirty: Story = {
  name: 'My page — unsaved changes block publishing', render: () => <MyPageScreen initial={savedDraft} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Display name'), ' K.');
    const publish = canvas.getByRole('button', { name: 'Publish page' });
    await waitFor(() => expect(publish).toBeDisabled());
    await expect(publish).toHaveAccessibleDescription('Save your changes before publishing.');
    await userEvent.click(canvas.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Publish page' })).toBeEnabled());
  },
};
export const MyPagePublished: Story = { name: 'My page — published', render: () => <MyPageScreen published initial={publishedPage} /> };
export const MyPageSlugTaken: Story = {
  name: 'My page — address already taken', render: () => <MyPageScreen published initial={publishedPage} />,
  parameters: { msw: { handlers: [http.put('/api/mentors/me/page', () => HttpResponse.json({ ok: false, error: { code: 'slug_taken', message: 'Check the highlighted field.', fieldErrors: { slug: ['This address is already taken'] } } }, { status: 409 }))] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/changing it breaks the old link/)).toBeInTheDocument();
    const slug = canvas.getByLabelText('Page address');
    await userEvent.clear(slug);
    await userEvent.type(slug, 'marta');
    await userEvent.click(canvas.getByRole('button', { name: 'Save changes' }));
    await expect(await canvas.findByText('This address is already taken')).toBeInTheDocument();
    await waitFor(() => expect(slug).toHaveFocus());
  },
};
export const MyPageRateOutOfBounds: Story = {
  name: 'My page — rate outside 90–600 zł', render: () => <MyPageScreen published initial={publishedPage} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const rate = canvas.getByLabelText('Rate per 25 minutes');
    await userEvent.clear(rate);
    await userEvent.type(rate, '50');
    await userEvent.click(canvas.getByRole('button', { name: 'Save rate' }));
    await expect(await canvas.findByText('The rate must be from 90 zł to 600 zł')).toBeInTheDocument();
  },
};
export const MyPageNarrow: Story = { name: 'My page — narrow', render: () => <MyPageScreen published initial={publishedPage} />, globals: { viewport: { value: 'mobile1', isRotated: false } } };

export const MySlots: Story = { name: 'My slots — slots with statuses', render: () => <MySlotsScreen /> };
export const MySlotsEmpty: Story = { name: 'My slots — none yet', render: () => <MySlotsScreen rows={[]} /> };
export const MySlotsNoPage: Story = { name: 'My slots — no page yet', render: () => <MySlotsScreen hasPage={false} /> };
export const MySlotsTooClose: Story = {
  name: 'My slots — too close to another slot', render: () => <MySlotsScreen />,
  parameters: { msw: { handlers: [http.post('/api/availability/slots', () => HttpResponse.json({ ok: false, error: { code: 'slot_too_close', message: 'Check the highlighted field.', fieldErrors: { startsAt: ['This start is less than 50 minutes from another of your slots.'] } } }, { status: 409 }))] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Session start, Warsaw time'), '2026-11-06T18:15');
    await userEvent.click(canvas.getByRole('button', { name: 'Add slot' }));
    await expect(await canvas.findByText('This start is less than 50 minutes from another of your slots.')).toBeInTheDocument();
  },
};
export const MySlotsOutsideWindow: Story = {
  name: 'My slots — outside the publish window', render: () => <MySlotsScreen />,
  parameters: { msw: { handlers: [http.post('/api/availability/slots', () => HttpResponse.json({ ok: false, error: { code: 'validation_error', message: 'Check the highlighted field.', fieldErrors: { startsAt: ['Choose a time from 2 hours to 14 days ahead.'] } } }, { status: 400 }))] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Session start, Warsaw time'), '2027-01-06T18:00');
    await userEvent.click(canvas.getByRole('button', { name: 'Add slot' }));
    await expect(await canvas.findByText('Choose a time from 2 hours to 14 days ahead.')).toBeInTheDocument();
  },
};
export const MySlotsRemove: Story = {
  name: 'My slots — remove with confirmation', render: () => <MySlotsScreen />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole('button', { name: 'Remove slot' })[0]);
    const dialog = await within(document.body).findByRole('alertdialog', { name: /Thursday, 6 November, 18:00/ });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove slot' }));
    await waitFor(() => expect(canvas.getAllByRole('row')).toHaveLength(4));
  },
};
export const MySlotsNarrow: Story = { name: 'My slots — narrow', render: () => <MySlotsScreen />, globals: { viewport: { value: 'mobile1', isRotated: false } } };
