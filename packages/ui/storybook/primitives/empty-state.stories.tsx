import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '@mentio/ui/components/button';
import { EmptyState } from '@mentio/ui/backend/feedback';

// Copy: book-and-pay `/rezerwacje` (“Nie masz jeszcze rezerwacji”), mentor-pages `/mentorzy` and
// `/mentor/terminy` empty states, platform default “Nic tu jeszcze nie ma” — in English.
const meta = {
  title: 'Primitives/EmptyState',
  component: EmptyState,
  args: { title: 'You have no bookings yet', description: 'When you book a text session with a mentor, it appears here.' },
  argTypes: { title: { control: 'text' }, description: { control: 'text' }, action: { control: false } },
  render: args => <div className="primitive-demo"><EmptyState {...args} /></div>,
} satisfies Meta<typeof EmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const WithAction: Story = { args: { action: <Button asChild><a href="#mentorzy">Find a mentor</a></Button> } };
export const TitleOnly: Story = { args: { title: 'There are no mentors on the list yet', description: undefined } };
export const MentorSlots: Story = { args: { title: 'You have no published slots', description: 'Add a time when you can take a text session. Mentees see it on your page.', action: <Button type="button">Add a slot</Button> } };
export const States: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-within-group">
    <p>One static state. It is centred by user decision — a recorded exception to “everything centred”. The action keeps Button states.</p>
    <EmptyState title="Nothing here yet" />
  </div>,
};
export const LongContent: Story = { args: { title: 'You have no bookings yet with mentors who work on Kubernetes ingress and cluster upgrades', description: 'When you book a 25- or 50-minute text session with a mentor, it appears here with its time in Warsaw time, its status and a link to the details.', action: <Button asChild><a href="#mentorzy">Find a mentor</a></Button> } };
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const ActionReachable: Story = {
  ...WithAction,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    const action = canvas.getByRole('link', { name: 'Find a mentor' });
    await expect(action).toHaveFocus();
    const root = action.closest('.mentio-empty-state')!;
    await expect(getComputedStyle(root).textAlign).toBe('center');
    await expect(getComputedStyle(root).paddingTop).toBe('40px');
    await expect(canvas.getByText('You have no bookings yet')).toBeInTheDocument();
  },
};
