import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { AuthPanel } from '@mentio/ui/components/auth/AuthPanel';
import { Link } from '@mentio/ui/backend/actions';
import { Button } from '@mentio/ui/components/button';

const meta = {
  title: 'Product/Platform and accounts/AuthPanel',
  component: AuthPanel,
  parameters: { layout: 'fullscreen' },
  args: { title: 'Become a mentor', description: 'Publish a page with your public work and the times you can take text sessions.', children: <div><Button type="button">Become a mentor</Button></div>, footer: <Link href="#/">Back to Mentio</Link> },
  argTypes: { children: { control: false }, footer: { control: false } },
} satisfies Meta<typeof AuthPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const WithoutDescription: Story = { args: { description: undefined } };
export const States: Story = { args: { description: 'A static frame: states belong to the form or action inside it (see the sign-in and registration screens).' } };
export const LongContent: Story = { args: { title: 'Create a mentor account to publish your page and your available text sessions', description: 'You can share your page link with developers who asked you for help, and optionally appear in the public mentor list. Ratings are not shown on Mentio; your public work is.' } };
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const LandmarkAndWidth: Story = {
  play: async ({ canvasElement }) => {
    const main = within(canvasElement).getByRole('main', { name: 'Become a mentor' });
    await expect(main.getBoundingClientRect().width).toBeLessThanOrEqual(448);
    await expect(getComputedStyle(main).textAlign).toBe('start');
  },
};
