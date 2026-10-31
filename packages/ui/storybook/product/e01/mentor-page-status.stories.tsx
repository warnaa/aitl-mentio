import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { http, HttpResponse } from 'msw';
import { MentorPageStatus } from '@mentio/ui/components/mentors/MentorPageStatus';
import { ActionButton } from '@mentio/ui/backend/actions';
import { apiCall } from '@mentio/ui/backend/api';

const base = { heading: 'Your page', shareLabel: 'Share link', shareUrl: 'https://mentio.example/mentorzy/alex', copyLabel: 'Copy link', copiedLabel: 'Copied', copyFailedLabel: 'Select the link and copy it manually' };
const publish = <ActionButton label="Publish page" pendingLabel="Publishing…" run={() => apiCall('/api/mentors/me/page/publish', { method: 'POST' })} />;
const unpublish = <ActionButton label="Unpublish page" variant="outline" pendingLabel="Unpublishing…" run={() => apiCall('/api/mentors/me/page/unpublish', { method: 'POST' })} />;

const meta = {
  title: 'Product/E01 — Mentor page and discovery/MentorPageStatus',
  component: MentorPageStatus,
  parameters: { msw: { handlers: [http.post('/api/mentors/me/page/:action', () => HttpResponse.json({ ok: true, data: {} }))] } },
  args: { ...base, statusLabel: 'Draft', statusTone: 'neutral', action: publish },
  argTypes: { action: { control: false }, view: { control: false } },
  render: args => <div className="primitive-demo"><MentorPageStatus {...args} /></div>,
} satisfies Meta<typeof MentorPageStatus>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Draft: Story = {};
export const Published: Story = { args: { statusLabel: 'Published', statusTone: 'success', action: unpublish, view: { href: '#/mentorzy/alex', label: 'View page' } } };
export const PublishBlockedByUnsavedChanges: Story = { args: { action: <ActionButton label="Publish page" run={async () => ({ ok: true as const, data: null, status: 200 })} disabled disabledReason="Save your changes before publishing." /> } };
export const States: Story = {
  render: args => <div className="primitive-demo flex flex-col gap-between-groups">
    <p>Draft, published and publish-blocked are separate stories. Copy feedback is local and announced politely; failure to copy asks to copy manually.</p>
    <MentorPageStatus {...args} />
  </div>,
};
export const LongContent: Story = { args: { shareUrl: 'https://mentio.example/mentorzy/aleksandra-wisniewska-kowalczyk-kubernetes-ingress' } };
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const CopyAnnouncesLocally: Story = {
  ...Published,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => undefined } });
    await userEvent.click(canvas.getByRole('button', { name: 'Copy link' }));
    await waitFor(() => expect(canvas.getByRole('status')).toHaveTextContent('Copied'));
    await expect(canvas.getByLabelText('Share link')).toHaveValue('https://mentio.example/mentorzy/alex');
    await expect(canvas.getByRole('link', { name: 'View page' })).toBeInTheDocument();
  },
};
