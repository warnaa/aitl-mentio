import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { EmptyState } from '../../backend/feedback/EmptyState';
import { MentorCard } from './MentorCard';
import { MentorDirectory } from './MentorProfileCard';

const meta = {
  title: 'Product/Mentors/Mentor list', component: MentorCard, tags: ['autodocs'],
  args: {
    name: 'Sam Nowak', introduction: 'I build typed APIs and help teams untangle generics, narrowing and the error-handling patterns that grow around them. Bring the code you are stuck on.',
    stacks: ['TypeScript', 'React'], publicWorkUrl: 'https://example.com/sam', prices: { price25Cents: 8000, price50Cents: 15000, currency: 'PLN' },
    nextSlotStartsAt: '2026-11-12T09:00:00.000Z', href: '#mentor-page',
  },
  parameters: { layout: 'padded', docs: { description: { component: 'One mentor in the public list (#39). The card shows no rating, score or rank (R13, N02). A mentee compares mentors by the plain description, public work, prices and the next bookable time. All people shown are fictional.' } } },
} satisfies Meta<typeof MentorCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Card: Story = {};
export const WithoutPublicWork: Story = { args: { publicWorkUrl: null, introduction: null } };

function ListExample({ empty = false }: { empty?: boolean }) {
  const [selectedStack, setSelectedStack] = useState<string | null>(null);
  const mentors = empty || selectedStack === 'Python' ? [] : [meta.args, { ...meta.args, name: 'Riya Kapoor', stacks: ['TypeScript', 'AI agents'], nextSlotStartsAt: '2026-11-13T17:30:00.000Z' }];
  return <MentorDirectory stacks={['TypeScript', 'React', 'Python', 'AI agents']} selectedStack={selectedStack} onStackChange={setSelectedStack} resultCount={mentors.length}
    empty={<EmptyState title="No mentors have open times right now" description="Choose another stack or check back for new availability." />}>
    {mentors.map(mentor => <MentorCard key={mentor.name} {...mentor} />)}
  </MentorDirectory>;
}
export const List: Story = { render: () => <ListExample />, parameters: { docs: { description: { story: 'Choose Python to see the empty state. The host supplies mentors already filtered and ordered by most recently published availability.' } } } };
export const EmptyList: Story = { render: () => <ListExample empty /> };
