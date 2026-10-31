import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { ApiSetupSpecimen, ColorFoundations, KeyboardSpecimen, LayoutSpecimen, MotionSpecimen, ThemeSpecimen } from './foundation-previews';

const meta = { title: 'Foundations/Checks', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Contrast: Story = {
  render: () => <ColorFoundations />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-contrast-result]').length).toBeGreaterThan(100));
    await expect(canvasElement.querySelector('[data-contrast-result="fail"]')).toBeNull();
  },
};

export const KeyboardFocus: Story = {
  render: () => <KeyboardSpecimen />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByRole('button', { name: 'Review availability' }).focus();
    await userEvent.tab();
    await expect(canvas.getByRole('textbox', { name: 'Your question' })).toHaveFocus();
    await userEvent.type(canvas.getByRole('textbox'), 'The ingress stopped responding.');
    await expect(canvas.getByRole('textbox')).toHaveValue('The ingress stopped responding.');
  },
};

export const RootThemeAndPortal: Story = {
  render: () => <ThemeSpecimen />,
  play: async ({ canvasElement, globals }) => {
    await expect(document.documentElement.classList.contains('dark')).toBe(globals.theme === 'dark');
    await expect(globals.theme).toBe(matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Show portal sample' }));
    const portal = within(document.body).getByTestId('foundation-portal');
    await expect(canvasElement.contains(portal)).toBe(false);
    const probe = document.createElement('span');
    probe.style.color = 'var(--popover-foreground)';
    probe.style.backgroundColor = 'var(--popover)';
    document.body.append(probe);
    try {
      await expect(getComputedStyle(portal).color).toBe(getComputedStyle(probe).color);
      await expect(getComputedStyle(portal).backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
    } finally { probe.remove(); }
    await userEvent.click(within(portal).getByRole('button', { name: 'Close portal sample' }));
    await expect(within(document.body).queryByTestId('foundation-portal')).toBeNull();
  },
};

export const LocalFeedback: Story = {
  render: () => <MotionSpecimen />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Save draft example' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('Draft saved');
    const motion = canvasElement.querySelector('.foundation-motion');
    await expect(motion).not.toBeNull();
    if (motion && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await expect(parseFloat(getComputedStyle(motion).transitionDuration)).toBe(0);
    }
  },
};

export const ResponsiveLayout: Story = { render: () => <LayoutSpecimen /> };

export const MockApiSuccess: Story = {
  render: () => <ApiSetupSpecimen />,
  parameters: { msw: { handlers: [http.get('/api/health', () => HttpResponse.json({ ok: true, data: { database: 'ready' } }))] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Check mock API' }));
    await waitFor(() => expect(canvas.getByRole('status')).toHaveTextContent('Mock API: ready'));
  },
};
export const MockApiOffline: Story = {
  render: () => <ApiSetupSpecimen />,
  parameters: { msw: { handlers: [http.get('/api/health', () => HttpResponse.error())] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Check mock API' }));
    await waitFor(() => expect(canvas.getByRole('status')).toHaveTextContent('Mock API unavailable — try again.'));
  },
};
