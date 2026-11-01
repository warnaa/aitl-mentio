import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { delay, http, HttpResponse } from 'msw';
import { getWorker } from 'msw-storybook-addon';
import { apiCall, type ApiResult, type Page } from '@mentio/ui/backend/api';
import { DataTable, type DataTableColumn } from '@mentio/ui/backend/tables';
import { adminUsers, legacyUsers, longUser, type AdminUser } from '../../fixtures/users';
import { AdminFrame } from './admin-frame';

// The existing admin Users list (`/admin/users`; accounts spec UI/UX → Admin pages, Stage B.4). Columns,
// order, page size, copy and the empty title follow `packages/app/src/app/admin/users/`. Requests go
// through the real `apiCall` to `GET /api/users`, answered by MSW with the `Page<UserDto>` envelope.
// The admin guard (signed out → sign-in with returnTo; signed in without `admin` → 404) runs on the
// server before this page renders. It is a contract, not shown here: these stories only show what an
// admin sees. Decision ledger: `.ai/runs/2026-11-01-admin-users-stories.md`.
const PAGE_SIZE = 20;

// User decision 2026-11-01 (ledger L-04): Created follows platform spec F7 `formatDay` — day, month and year in
// Warsaw time. F7 is not built yet and formats Polish; this is its English story stand-in, as fixtures do.
const formatDay = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Warsaw' });
const columns: DataTableColumn<AdminUser>[] = [
  { id: 'email', header: 'Email', cell: user => <span className="font-medium">{user.email}</span> },
  { id: 'name', header: 'Name', cell: user => user.name ?? '—' },
  { id: 'createdAt', header: 'Created', className: 'text-right tabular-nums', cell: user => formatDay.format(new Date(user.createdAt)) },
];

interface Request { offset: number; attempt: number }

function AdminUsersScreen() {
  const [request, setRequest] = useState<Request>({ offset: 0, attempt: 0 });
  const [answer, setAnswer] = useState<{ request: Request; result: ApiResult<Page<AdminUser>> }>();
  const [page, setPage] = useState<Page<AdminUser>>();
  useEffect(() => {
    let isCurrent = true;
    void apiCall<Page<AdminUser>>('/api/users', { query: { limit: PAGE_SIZE, offset: request.offset } }).then(result => {
      if (!isCurrent) return;
      setAnswer({ request, result });
      // The last loaded page stays on screen while the next one loads (DataTable: rows kept, aria-busy).
      if (result.ok) setPage(result.data);
    });
    return () => { isCurrent = false; };
  }, [request]);
  const isLoading = answer?.request !== request;
  const failure = !isLoading && answer && !answer.result.ok ? answer.result.error : undefined;
  return (
    <AdminFrame>
      <div className="mx-auto flex max-w-(--content-max-width) flex-col gap-between-groups">
        <div>
          <h1 className="mentio-public-title">Users</h1>
          <p className="text-sm text-muted-foreground">Everyone with an account, newest first.</p>
        </div>
        <DataTable label="Users" columns={columns} rows={page?.items} getRowId={user => user.id} isLoading={isLoading}
          error={failure?.message} onRetry={() => setRequest(current => ({ ...current, attempt: current.attempt + 1 }))}
          emptyTitle="No users yet"
          pagination={page && { offset: page.offset, limit: page.limit, total: page.total, onOffsetChange: offset => setRequest({ offset, attempt: 0 }) }} />
      </div>
    </AdminFrame>
  );
}

/** `GET /api/users?limit&offset` as `makeCrudRoute` answers it; the fixture is already newest first. */
const listOf = (users: AdminUser[], hold: (offset: number) => boolean = () => false) => http.get('/api/users', async ({ request }) => {
  const query = new URL(request.url).searchParams;
  const limit = Number(query.get('limit') ?? PAGE_SIZE);
  const offset = Number(query.get('offset') ?? 0);
  if (hold(offset)) await delay('infinite');
  return HttpResponse.json({ ok: true, data: { items: users.slice(offset, offset + limit), total: users.length, limit, offset } });
});
const networkError = (offsets: (offset: number) => boolean = () => true, users = adminUsers) => http.get('/api/users', ({ request }) => {
  const offset = Number(new URL(request.url).searchParams.get('offset') ?? 0);
  return offsets(offset) ? HttpResponse.error() : HttpResponse.json({ ok: true, data: { items: users.slice(offset, offset + PAGE_SIZE), total: users.length, limit: PAGE_SIZE, offset } });
});
// `apiHandler`'s envelope for an unexpected failure (`core/src/http/apiHandler.ts`, INTERNAL_ERROR).
const serverError = http.get('/api/users', () => HttpResponse.json({ ok: false, error: { code: 'internal_error', message: 'Internal server error' } }, { status: 500 }));

const meta = {
  title: 'Product/Platform and accounts/Admin users',
  render: () => <AdminUsersScreen />,
  parameters: { layout: 'fullscreen', msw: { handlers: [listOf(adminUsers)] } },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const table = (canvasElement: HTMLElement) => canvasElement.querySelector<HTMLElement>('.mentio-data-table');
const bodyRows = (canvasElement: HTMLElement) => within(canvasElement).getAllByRole('row').slice(1);
const loaded = (canvasElement: HTMLElement, range: string) => within(canvasElement).findByText(range);

export const FirstLoad: Story = {
  name: 'Users — first load',
  parameters: { msw: { handlers: [listOf(adminUsers, () => true)] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 1, name: 'Users' })).toBeInTheDocument();
    await expect(await canvas.findByRole('status')).toHaveTextContent('Loading…');
    await expect(canvas.queryByRole('table')).toBeNull();
  },
};

export const Results: Story = {
  name: 'Users — results',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await loaded(canvasElement, '1–20 of 45');
    await expect(canvas.getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Email', 'Name', 'Created']);
    const rows = bodyRows(canvasElement);
    await expect(rows).toHaveLength(20);
    await expect(rows[0]).toHaveTextContent('kasia.nowak@example.test');
    await expect(rows[0]).toHaveTextContent('31 October 2026');
    await expect(rows[19]).toHaveTextContent('12 October 2026');
    await expect(canvas.getByRole('table', { name: 'Users' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Previous' })).toHaveAttribute('aria-disabled', 'true');
    await expect(canvas.getByRole('button', { name: 'Next' })).not.toHaveAttribute('aria-disabled');
  },
};

// Ledger L-17 (accepted 2026-11-01): once the admin guard ships, the viewer is an admin account, so a total
// of zero cannot reach this screen. The state is kept because DataTable renders it and the task asks for it.
export const Empty: Story = {
  name: 'Users — empty',
  parameters: { msw: { handlers: [listOf([])] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No users yet')).toBeInTheDocument();
    await expect(canvas.queryByRole('table')).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Next' })).toBeNull();
  },
};

export const LoadFailed: Story = {
  name: 'Users — load failed (network)',
  parameters: { msw: { handlers: [networkError()] } },
  play: async ({ canvasElement }) => {
    const alert = await within(canvasElement).findByRole('alert');
    await expect(alert).toHaveTextContent('Something went wrong');
    await expect(alert).toHaveTextContent('Check your connection, then try again.');
    await expect(within(alert).getByRole('button', { name: 'Try again' })).toBeEnabled();
  },
};

export const LoadFailedServer: Story = {
  name: 'Users — load failed (server error)',
  parameters: { msw: { handlers: [serverError] } },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByRole('alert')).toHaveTextContent('Internal server error');
  },
};

export const RetryAfterFailure: Story = {
  name: 'Users — retry after a failed load',
  parameters: { msw: { handlers: [networkError()] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alert = await canvas.findByRole('alert');
    // The connection comes back: the next request reaches the list endpoint.
    getWorker().use(listOf(adminUsers, () => false));
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    await loaded(canvasElement, '1–20 of 45');
    await expect(canvas.queryByRole('alert')).toBeNull();
    await expect(bodyRows(canvasElement)).toHaveLength(20);
  },
};

export const NextPageLoading: Story = {
  name: 'Users — next page loading (rows kept)',
  parameters: { msw: { handlers: [listOf(adminUsers, offset => offset > 0)] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await loaded(canvasElement, '1–20 of 45');
    await userEvent.click(canvas.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(table(canvasElement)).toHaveAttribute('aria-busy', 'true'));
    const rows = bodyRows(canvasElement);
    await expect(rows).toHaveLength(20);
    await expect(rows[0]).toHaveTextContent('kasia.nowak@example.test');
    await expect(canvas.getByRole('status')).toHaveTextContent('1–20 of 45');
    await expect(canvas.queryByText('Loading…')).toBeNull();
    // Unavailable while loading, but still focusable: focus stays on Next (ledger L-20).
    await expect(canvas.getByRole('button', { name: 'Previous' })).toHaveAttribute('aria-disabled', 'true');
    await expect(canvas.getByRole('button', { name: 'Next' })).toHaveAttribute('aria-disabled', 'true');
    await expect(canvas.getByRole('button', { name: 'Next' })).toHaveFocus();
  },
};

export const Paging: Story = {
  name: 'Users — paging to the last page and back',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await loaded(canvasElement, '1–20 of 45');
    await userEvent.click(canvas.getByRole('button', { name: 'Next' }));
    await loaded(canvasElement, '21–40 of 45');
    await expect(bodyRows(canvasElement)[0]).toHaveTextContent('11 October 2026');
    await userEvent.click(canvas.getByRole('button', { name: 'Next' }));
    await loaded(canvasElement, '41–45 of 45');
    await expect(bodyRows(canvasElement)).toHaveLength(5);
    await expect(canvas.getByRole('button', { name: 'Next' })).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(canvas.getByRole('button', { name: 'Previous' }));
    await loaded(canvasElement, '21–40 of 45');
    await expect(table(canvasElement)).toHaveAttribute('aria-busy', 'false');
  },
};

// User decision 2026-11-01 (ledger L-15): a failed refresh keeps the rows already shown, with the error and
// Try again above them. Try again repeats the page that failed.
export const NextPageFailed: Story = {
  name: 'Users — next page failed, retry',
  parameters: { msw: { handlers: [networkError(offset => offset > 0)] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await loaded(canvasElement, '1–20 of 45');
    await userEvent.click(canvas.getByRole('button', { name: 'Next' }));
    const alert = await canvas.findByRole('alert');
    await expect(alert).toHaveTextContent('Check your connection, then try again.');
    await expect(bodyRows(canvasElement)).toHaveLength(20);
    await expect(bodyRows(canvasElement)[0]).toHaveTextContent('kasia.nowak@example.test');
    await expect(canvas.getByRole('status')).toHaveTextContent('1–20 of 45');
    getWorker().use(listOf(adminUsers, () => false));
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    await loaded(canvasElement, '21–40 of 45');
  },
};

export const MissingNames: Story = {
  name: 'Users — missing names',
  parameters: { msw: { handlers: [listOf(legacyUsers)] } },
  play: async ({ canvasElement }) => {
    await loaded(canvasElement, '1–6 of 6');
    const names = bodyRows(canvasElement).map(row => within(row).getAllByRole('cell')[1].querySelector('.mentio-table-cell-value')?.textContent);
    await expect(names).toEqual(['—', 'Alex Kowalski', '—', 'Piotr Wójcik', '—', '—']);
  },
};

export const LongData: Story = {
  name: 'Users — long data',
  parameters: { msw: { handlers: [listOf([longUser, ...adminUsers])] } },
  play: async ({ canvasElement }) => {
    await loaded(canvasElement, '1–20 of 46');
    await expect(bodyRows(canvasElement)[0]).toHaveTextContent(longUser.email);
    await expect(bodyRows(canvasElement)[0]).toHaveTextContent(longUser.name!);
    // Ledger L-14: in the wide table long values do not wrap, so the container scrolls; it is then a
    // focusable region named like the table. Stacked rows wrap and do not scroll. Measured, not assumed:
    // the test viewport is not always the story's.
    const container = canvasElement.querySelector<HTMLElement>('.mentio-table-container')!;
    await waitFor(() => { if (container.scrollWidth > container.clientWidth) expect(container).toHaveAttribute('tabindex', '0'); });
    if (container.scrollWidth > container.clientWidth) {
      await expect(within(canvasElement).getByRole('region', { name: 'Users' })).toBe(container);
    } else {
      await expect(container).not.toHaveAttribute('tabindex');
    }
  },
};

const narrow = { viewport: { value: 'mobile1', isRotated: false } };
export const NarrowResults: Story = {
  ...Results, name: 'Users — narrow, results', globals: narrow,
  play: async context => {
    await Results.play!(context);
    // Ledger L-21: stacked values sit under their names, left-aligned, despite the column's `text-right`.
    const row = bodyRows(context.canvasElement)[0];
    if (getComputedStyle(row).display !== 'grid') return;
    await expect(getComputedStyle(within(row).getAllByRole('cell')[2]).textAlign).toBe('start');
  },
};
export const NarrowLongData: Story = { ...LongData, name: 'Users — narrow, long data', globals: narrow };

export const KeyboardPaging: Story = {
  name: 'Users — keyboard paging',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await loaded(canvasElement, '1–20 of 45');
    const next = canvas.getByRole('button', { name: 'Next' });
    // Previous is unavailable on the first page but stays in the tab order (aria-disabled).
    for (let presses = 0; presses < 10 && document.activeElement !== next; presses += 1) await userEvent.tab();
    await expect(next).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await loaded(canvasElement, '21–40 of 45');
    await expect(next).toHaveFocus();
    await expect(canvas.getByRole('button', { name: 'Previous' })).not.toHaveAttribute('aria-disabled');
    await userEvent.keyboard('{Enter}');
    await loaded(canvasElement, '41–45 of 45');
    // Ledger L-20: at the last page Next is unavailable, and focus is still on it.
    await expect(next).toHaveAttribute('aria-disabled', 'true');
    await expect(next).toHaveFocus();
  },
};
