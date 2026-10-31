import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { MentorDirectory } from '@mentio/ui/components/mentors/MentorDirectory';
import { directoryItems, longDirectoryItem } from '../../fixtures/mentors';

const pagination = { navLabel: 'Mentor list pages', label: 'Page 2 of 3', previousHref: '#/mentorzy?strona=1', nextHref: '#/mentorzy?strona=3', previousLabel: 'Previous page', nextLabel: 'Next page' };
const meta = {
  title: 'Product/E01 — Mentor page and discovery/MentorDirectory',
  component: MentorDirectory,
  args: { heading: 'Mentors', intro: 'Mentors with a bookable slot come first.', items: directoryItems, emptyText: 'There are no mentors on the list yet.' },
  argTypes: { items: { control: false }, pagination: { control: false }, linkComponent: { control: false } },
} satisfies Meta<typeof MentorDirectory>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const WithPagination: Story = { args: { pagination } };
export const FirstPage: Story = { args: { pagination: { ...pagination, label: 'Page 1 of 3', previousHref: undefined } } };
export const Empty: Story = { args: { items: [] } };
export const PartialData: Story = { args: { items: directoryItems.filter(item => item.priceLabel === 'No rate yet' || item.availabilityLabel === 'No slots to book') } };
export const ManyMentors: Story = { args: { items: Array.from({ length: 20 }, (_, index) => ({ ...directoryItems[index % 4], href: `#/mentorzy/m${index}`, displayName: `${directoryItems[index % 4].displayName} ${index + 1}` })), pagination } };
export const States: Story = { args: { items: directoryItems.slice(0, 2) }, render: args => <div className="flex flex-col gap-section"><p className="primitive-demo">Static content: names are links with the shared Link states; no row hover (rows are not interactive).</p><MentorDirectory {...args} /></div> };
export const LongContent: Story = { args: { items: [longDirectoryItem, ...directoryItems] } };
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const NoRatingsAndRows: Story = {
  args: { pagination },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('listitem')).toHaveLength(4);
    // N02: no rating element; “accessibility reviews” in a description is ordinary content.
    await expect(canvas.queryByText(/\brating\b|★|\bstars?\b/i)).toBeNull();
    const row = canvas.getAllByRole('listitem')[0];
    await expect(getComputedStyle(row).borderBottomWidth).toBe('1px');
    await expect(canvas.getByRole('navigation', { name: 'Mentor list pages' })).toBeInTheDocument();
  },
};
