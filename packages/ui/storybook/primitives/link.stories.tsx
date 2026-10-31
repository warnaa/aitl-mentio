import type { Meta, StoryObj } from '@storybook/react-vite';
import type { MouseEvent } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Link } from '@mentio/ui/backend/actions';

const meta = {
  title: 'Primitives/Link', component: Link,
  args: { href: '#public-work', children: 'View Alex’s public work' },
  render: args => <div className="primitive-demo"><Link {...args} /><p id="public-work">Public work from this fictional mentor.</p></div>,
  argTypes: { href: { control: 'text' }, children: { control: 'text' }, target: { control: 'select', options: ['_self', '_blank'] } },
} satisfies Meta<typeof Link>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const ExternalWork: Story = { args: { href: 'https://example.com/alex/ingress-upgrade', target: '_blank', rel: 'noopener noreferrer nofollow ugc', children: 'Read Alex’s ingress upgrade notes (opens in a new tab)' } };
export const StateMatrix: Story = {
  render: () => <div className="primitive-demo flex flex-wrap gap-between-groups">
    <Link href="#public-work">Public work</Link>
    <Link href="#public-work" data-preview-state="hover">Hover: public work</Link>
    <Link href="#public-work" data-preview-state="focus">Focus: public work</Link>
    <Link href="#public-work" data-preview-state="pressed">Pressed: public work</Link>
    <Link href="#public-work" aria-current="page">Current mentor page</Link>
    <p id="public-work">Alex explains a staging ingress upgrade. Link state does not claim that a remote page has loaded.</p>
  </div>,
};
export const LongContent: Story = {
  args: { children: 'Read the mentor’s public work about diagnosing an ingress upgrade before booking a text session' },
  parameters: { layout: 'fullscreen' },
  render: args => <div className="primitive-demo"><Link {...args} /></div>,
};
export const GoodAndBad: Story = {
  render: () => <div className="primitive-demo flex flex-wrap gap-between-groups">
    <div><p>Good: the destination is clear outside its sentence.</p><Link href="#public-work">Read the ingress upgrade notes</Link></div>
    <div><p>Bad wording: “Click here”.</p><p>A list of links would lose the destination’s meaning. The bad example is explanatory text, not an inaccessible link.</p></div>
    <p id="public-work">Public work from this fictional mentor.</p>
  </div>,
};
export const KeyboardNavigation: Story = {
  args: { onClick: fn((event: MouseEvent<HTMLAnchorElement>) => event.preventDefault()) },
  play: async ({ canvasElement, args }) => {
    const link = within(canvasElement).getByRole('link', { name: 'View Alex’s public work' });
    link.focus();
    await expect(link).toHaveFocus();
    await expect(link).toHaveAttribute('href', '#public-work');
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};
