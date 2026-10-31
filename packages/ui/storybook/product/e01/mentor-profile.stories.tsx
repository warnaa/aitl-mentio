import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { MentorProfile } from '@mentio/ui/components/mentors/MentorProfile';
import { profile } from '../../fixtures/mentors';

const meta = {
  title: 'Product/E01 — Mentor page and discovery/MentorProfile',
  component: MentorProfile,
  args: profile,
  argTypes: { work: { control: false }, prices: { control: false }, slots: { control: false }, linkComponent: { control: false } },
} satisfies Meta<typeof MentorProfile>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const NoRate: Story = { args: { prices: { ...profile.prices, items: null } } };
export const NoSlots: Story = { args: { slots: { ...profile.slots, days: [] } } };
export const BookableSlotsE02: Story = { name: 'Bookable slots (E02 links)', args: { slots: { ...profile.slots, bookLabel: 'Book', days: profile.slots.days.map(day => ({ ...day, slots: day.slots.map(slot => ({ ...slot, href: `#/rezerwacje/nowa/${slot.id}` })) })) } } };
export const States: Story = { args: { prices: { ...profile.prices, items: null }, slots: { ...profile.slots, days: [] } }, render: args => <div className="flex flex-col gap-section"><p className="primitive-demo">Partial data: no rate and no slot. Links keep Link states; slots are plain text in E01 and links in E02.</p><MentorProfile {...args} /></div> };
export const LongContent: Story = {
  args: {
    displayName: 'Aleksandra Wiśniewska-Kowalczyk',
    description: `${profile.description}\n\n${'I review manifests, Helm values, ingress annotations and controller logs. '.repeat(6)}`,
    work: { ...profile.work, links: ['https://example.test/aleksandra-wisniewska-kowalczyk/a-very-long-repository-name-about-ingress-controllers-and-tls-termination/blob/main/docs/upgrade-notes.md', ...profile.work.links] },
    slots: { ...profile.slots, days: Array.from({ length: 6 }, (_, index) => ({ label: `Day ${index + 1}, ${index + 6} November`, slots: [{ id: `l${index}a`, label: '07:15' }, { id: `l${index}b`, label: '08:30' }, { id: `l${index}c`, label: '18:00' }, { id: `l${index}d`, label: '19:30' }] })) },
  },
};
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const SafeLinksAndNoRatings: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const links = canvas.getAllByRole('link');
    await expect(links).toHaveLength(2);
    for (const link of links) {
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow ugc');
      await expect(link).toHaveAccessibleName(/opens in a new tab/);
    }
    // N02: no rating element; “accessibility reviews” in a description is ordinary content.
    await expect(canvas.queryByText(/\brating\b|★|\bstars?\b/i)).toBeNull();
    await expect(getComputedStyle(canvas.getByText(/I help developers/)).whiteSpace).toBe('pre-line');
  },
};
