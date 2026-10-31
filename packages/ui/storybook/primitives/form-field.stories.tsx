import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { FormField } from '@mentio/ui/backend/forms';
import { Input } from '@mentio/ui/components/input';
import { Textarea } from '@mentio/ui/components/textarea';

const meta = {
  title: 'Primitives/FormField', component: FormField,
  args: { label: 'Public work URL', description: 'Use a public repository or article that shows what you have built.', required: true, disabled: false, children: <Input type="url" /> },
  argTypes: { label: { control: 'text' }, description: { control: 'text' }, error: { control: 'text' }, required: { control: 'boolean' }, disabled: { control: 'boolean' }, children: { control: false } },
  render: args => <div className="primitive-demo"><FormField {...args} /></div>,
} satisfies Meta<typeof FormField>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Optional: Story = { args: { required: false } };
export const ErrorWithHint: Story = { args: { error: 'Enter a public URL beginning with https:// or http://.' } };
export const Disabled: Story = { args: { disabled: true, description: 'Editing is unavailable while the mentor page is being saved.' } };
export const States: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-between-groups">{['default', 'hover', 'focus', 'disabled', 'read-only', 'loading', 'error'].map(state => <FormField key={state} label={`Public work — ${state}`} description={state === 'disabled' ? 'Editing is unavailable while the page is being saved.' : 'A public repository or article helps a mentee judge your experience.'} disabled={state === 'disabled'} required error={state === 'error' ? 'Enter a valid public URL.' : undefined}><Input type="url" data-preview-state={state} readOnly={state === 'read-only'} aria-busy={state === 'loading'} /></FormField>)}</div>,
};
export const LongContent: Story = { args: { label: 'Explain the failure and the configuration you already checked before booking this text session', description: 'Include the relevant error message, expected behavior and what changed immediately before the problem appeared.', children: <Textarea minLength={20} maxLength={5000} /> } };
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const RequiredAndLinkedMessages: Story = {
  args: { description: 'Use a public repository or article.', error: 'Enter a public URL.' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const field = canvas.getByRole('textbox', { name: 'Public work URL' }) as HTMLInputElement;
    await expect(field.required).toBe(true);
    await expect(field.checkValidity()).toBe(false);
    const descriptions = field.getAttribute('aria-describedby')?.split(' ') ?? [];
    await expect(descriptions.length).toBeGreaterThanOrEqual(2);
    await expect(descriptions.map(id => document.getElementById(id)?.textContent).join(' ')).toContain('Use a public repository or article.');
    await expect(descriptions.map(id => document.getElementById(id)?.textContent).join(' ')).toContain('Enter a public URL.');
    await userEvent.type(field, 'https://example.test/ingress-upgrade');
    await expect(field.checkValidity()).toBe(true);
    await expect(field).toHaveAttribute('aria-invalid', 'true');
  },
};
