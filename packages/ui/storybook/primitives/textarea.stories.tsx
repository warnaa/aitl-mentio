import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Textarea } from '@mentio/ui/components/textarea';
import { Label } from '@mentio/ui/components/label';

const meta = {
  title: 'Primitives/Textarea', component: Textarea,
  args: { id: 'textarea-playground', placeholder: 'What failed, what did you expect, and what have you tried?', minLength: 20, maxLength: 5000, disabled: false, readOnly: false },
  argTypes: { disabled: { control: 'boolean' }, readOnly: { control: 'boolean' }, placeholder: { control: 'text' }, 'aria-invalid': { control: 'boolean' } },
  render: args => <div className="primitive-demo"><Label htmlFor={args.id}>Your question</Label><Textarea {...args} id={args.id} /></div>,
} satisfies Meta<typeof Textarea>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-between-groups">{['default', 'hover', 'focus', 'disabled', 'read-only', 'loading', 'error'].map(state => <div key={state}><Label htmlFor={`textarea-${state}`}>Your question — {state}</Label><Textarea id={`textarea-${state}`} data-preview-state={state} disabled={state === 'disabled'} readOnly={state === 'read-only'} aria-busy={state === 'loading'} aria-invalid={state === 'error'} aria-describedby={`textarea-${state}-hint`} defaultValue={state === 'read-only' ? 'Saved session context' : undefined} /><p id={`textarea-${state}-hint`}>{state === 'disabled' ? 'Editing is unavailable while the draft is being saved.' : state === 'error' ? 'Check this value before saving.' : state === 'loading' ? 'Waiting for the saved value; keep the existing context.' : 'The visible label stays available.'}</p></div>)}</div>,
};
export const LongContent: Story = { args: { id: 'textarea-long', defaultValue: 'My staging ingress stopped responding after a Helm upgrade. I checked the service endpoints, controller logs and previous values file; which configuration should I inspect next?' } };
export const Narrow: Story = { ...LongContent, args: { ...LongContent.args, id: 'textarea-narrow' }, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const KeyboardEditing: Story = {
  args: { defaultValue: '' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const field = canvas.getByRole('textbox', { name: 'Your question' });
    field.focus();
    await userEvent.type(field, 'The ingress stopped responding after the upgrade.');
    await expect(field).toHaveValue('The ingress stopped responding after the upgrade.');
    await userEvent.keyboard('{Control>}a{/Control}{Backspace}');
    await expect(field).toHaveValue('');
  },
};
