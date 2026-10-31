import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Input } from '@mentio/ui/components/input';
import { Label } from '@mentio/ui/components/label';

const meta = {
  title: 'Primitives/Input', component: Input,
  args: { id: 'input-playground', type: 'email', autoComplete: 'email', placeholder: 'alex@example.test', disabled: false, readOnly: false },
  argTypes: { disabled: { control: 'boolean' }, readOnly: { control: 'boolean' }, placeholder: { control: 'text' }, 'aria-invalid': { control: 'boolean' } },
  render: args => <div className="primitive-demo"><Label htmlFor={args.id}>Email address</Label><Input {...args} id={args.id} /></div>,
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Password: Story = { args: { type: 'password', autoComplete: 'current-password', placeholder: undefined }, render: args => <div className="primitive-demo"><Label htmlFor="password-example">Password</Label><Input {...args} id="password-example" /></div> };
export const Number: Story = { args: { type: 'number', min: 90, max: 600, inputMode: 'numeric', placeholder: undefined }, render: args => <div className="primitive-demo"><Label htmlFor="rate-example">Rate per 25 minutes (zł)</Label><Input {...args} id="rate-example" /></div> };

export const States: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-between-groups">{['default', 'hover', 'focus', 'disabled', 'read-only', 'loading', 'error'].map(state => <div key={state}><Label htmlFor={`input-${state}`}>Email address — {state}</Label><Input id={`input-${state}`} data-preview-state={state} disabled={state === 'disabled'} readOnly={state === 'read-only'} aria-busy={state === 'loading'} aria-invalid={state === 'error'} aria-describedby={`input-${state}-hint`} defaultValue={state === 'read-only' ? 'Saved session context' : undefined} /><p id={`input-${state}-hint`}>{state === 'disabled' ? 'Editing is unavailable while the draft is being saved.' : state === 'error' ? 'Check this value before saving.' : state === 'loading' ? 'Waiting for the saved value; keep the existing context.' : 'The visible label stays available.'}</p></div>)}</div>,
};
export const LongContent: Story = { args: { id: 'input-long', defaultValue: 'alexandra.long-display-name@mentor-example.test' } };
export const Narrow: Story = { ...LongContent, args: { ...LongContent.args, id: 'input-narrow' }, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const KeyboardEditing: Story = {
  args: { type: 'text', defaultValue: '' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const field = canvas.getByRole('textbox', { name: 'Email address' });
    field.focus();
    await userEvent.type(field, 'The ingress stopped responding after the upgrade.');
    await expect(field).toHaveValue('The ingress stopped responding after the upgrade.');
    await userEvent.keyboard('{Control>}a{/Control}{Backspace}');
    await expect(field).toHaveValue('');
  },
};
