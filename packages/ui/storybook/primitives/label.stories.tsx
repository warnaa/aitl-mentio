import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Label } from '@mentio/ui/components/label';
import { Input } from '@mentio/ui/components/input';

const meta = {
  title: 'Primitives/Label', component: Label,
  args: { children: 'Email address', htmlFor: 'label-playground' },
  argTypes: { children: { control: 'text' } },
  render: args => <div className="primitive-demo"><Label {...args} /><Input id={args.htmlFor} type="email" /></div>,
} satisfies Meta<typeof Label>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const States: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-between-groups">{['default', 'hover', 'focus', 'disabled', 'error'].map(state => <div key={state}><Label htmlFor={`label-${state}`} data-preview-state={state}>Question context — {state}</Label><Input id={`label-${state}`} data-preview-state={state} disabled={state === 'disabled'} aria-invalid={state === 'error'} aria-describedby={`label-${state}-help`} /><p id={`label-${state}-help`}>{state === 'disabled' ? 'Editing is unavailable while the draft is being saved.' : state === 'error' ? 'Add the context your mentor needs.' : 'The label identifies the field; the control receives focus.'}</p></div>)}</div>,
};
export const LongContent: Story = { args: { htmlFor: 'label-long', children: 'Email address used to sign in and return to your pending booking' } };
export const Narrow: Story = { ...LongContent, args: { ...LongContent.args, htmlFor: 'label-narrow' }, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const ClickToFocus: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText('Email address', { exact: true }));
    await expect(canvas.getByRole('textbox', { name: 'Email address' })).toHaveFocus();
    await userEvent.type(canvas.getByRole('textbox'), 'alex@example.test');
    await expect(canvas.getByRole('textbox')).toHaveValue('alex@example.test');
  },
};
