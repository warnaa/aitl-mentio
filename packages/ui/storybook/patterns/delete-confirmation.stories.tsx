import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { delay, http, HttpResponse } from 'msw';
import { ActionButton } from '@mentio/ui/backend/actions';
import { apiCall } from '@mentio/ui/backend/api';
import { Separator } from '@mentio/ui/components/separator';

// Mentor-pages `/mentor/terminy`: remove a slot behind a confirm step (F5); `409 slot_held`.
const slots = [{ id: 's1', label: 'Thursday, 6 November 2026, 18:00' }, { id: 's2', label: 'Friday, 7 November 2026, 09:30' }];

function SlotList() {
  const [rows, setRows] = useState(slots);
  const [removed, setRemoved] = useState<string | null>(null);
  return <section className="primitive-demo flex flex-col gap-within-group" aria-labelledby="slots-title">
    <h1 id="slots-title" className="text-2xl font-semibold">My slots</h1>
    <p role="status">{removed ? `The slot on ${removed} was removed.` : ''}</p>
    <ul aria-label="Upcoming slots">{rows.map((slot, index) => <li key={slot.id}>
      {index > 0 && <Separator />}
      <div className="flex flex-wrap items-center justify-between gap-within-group py-2">
        <span className="tabular-nums">{slot.label} (Warsaw time)</span>
        <ActionButton label="Remove slot" pendingLabel="Removing slot…" variant="destructive" size="sm"
          run={() => apiCall(`/api/availability/slots/${slot.id}`, { method: 'DELETE' })}
          confirm={{ title: `Remove the slot on ${slot.label}?`, description: 'Mentees will no longer see this time on your page.', confirmLabel: 'Remove slot', cancelLabel: 'Keep slot' }}
          onSuccess={() => { setRows(current => current.filter(item => item.id !== slot.id)); setRemoved(slot.label); }} />
      </div>
    </li>)}</ul>
  </section>;
}

const removedOk = http.delete('/api/availability/slots/:id', () => HttpResponse.json({ ok: true, data: null }));
const meta = { title: 'Patterns/Delete confirmation', parameters: { msw: { handlers: [removedOk] } }, render: () => <SlotList /> } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

async function openFirst(canvasElement: HTMLElement) {
  await userEvent.click(within(canvasElement).getAllByRole('button', { name: 'Remove slot' })[0]);
  return within(document.body).findByRole('alertdialog');
}

export const Ask: Story = {};
export const Confirming: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await openFirst(canvasElement);
    await expect(dialog).toHaveAccessibleName('Remove the slot on Thursday, 6 November 2026, 18:00?');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Keep slot' })).toHaveFocus());
    await expect(within(dialog).getByRole('button', { name: 'Remove slot' })).toBeInTheDocument();
  },
};
export const Pending: Story = {
  parameters: { msw: { handlers: [http.delete('/api/availability/slots/:id', async () => { await delay('infinite'); return HttpResponse.json({}); })] } },
  play: async ({ canvasElement }) => {
    const dialog = await openFirst(canvasElement);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove slot' }));
    await expect(await within(dialog).findByRole('button', { name: 'Removing slot…' })).toHaveAttribute('aria-busy', 'true');
    await expect(within(dialog).getByRole('button', { name: 'Keep slot' })).toBeDisabled();
  },
};
export const Removed: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await openFirst(canvasElement);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove slot' }));
    await waitFor(() => expect(within(document.body).queryByRole('alertdialog')).toBeNull());
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent('The slot on Thursday, 6 November 2026, 18:00 was removed.');
    await expect(canvas.getAllByRole('listitem')).toHaveLength(1);
  },
};
export const Refused: Story = {
  parameters: { msw: { handlers: [http.delete('/api/availability/slots/:id', () => HttpResponse.json({ ok: false, error: { code: 'slot_held', message: 'This slot is held by a booking in progress and cannot be removed.' } }, { status: 409 }))] } },
  play: async ({ canvasElement }) => {
    const dialog = await openFirst(canvasElement);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove slot' }));
    await expect(await within(canvasElement).findByRole('alert')).toHaveTextContent('held by a booking in progress');
    await expect(within(canvasElement).getAllByRole('listitem')).toHaveLength(2);
  },
};
export const NetworkError: Story = {
  parameters: { msw: { handlers: [http.delete('/api/availability/slots/:id', () => HttpResponse.error())] } },
  play: async ({ canvasElement }) => {
    const dialog = await openFirst(canvasElement);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove slot' }));
    await expect(await within(canvasElement).findByRole('alert')).toHaveTextContent('Check your connection, then try again.');
  },
};
export const Narrow: Story = { globals: { viewport: { value: 'mobile1', isRotated: false } } };
