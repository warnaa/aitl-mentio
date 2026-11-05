// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ResourcePanel } from './ResourcePanel';

afterEach(cleanup);

const children = (value: { name: string }) => <p>{value.name}</p>;
const resource = { loading: false, error: null, data: null, reload: () => {} };

it('shows loading until the first data arrives', () => {
  render(<ResourcePanel resource={{ ...resource, loading: true }}>{children}</ResourcePanel>);
  expect(screen.getByRole('status')).toBeTruthy();
});

it('keeps loaded content mounted while a reload is in flight', () => {
  render(<ResourcePanel resource={{ ...resource, loading: true, data: { name: 'Ada' } }}>{children}</ResourcePanel>);
  expect(screen.getByText('Ada')).toBeTruthy();
  expect(screen.queryByRole('status')).toBeNull();
});

it('reports an error over stale content and retries on request', () => {
  const reload = vi.fn();
  render(
    <ResourcePanel resource={{ ...resource, error: 'down', data: { name: 'Ada' }, reload }}>{children}</ResourcePanel>,
  );
  expect(screen.getByRole('alert').textContent).toContain('down');
  expect(screen.queryByText('Ada')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(reload).toHaveBeenCalledOnce();
});

it('shows an empty state for a settled request with no data', () => {
  render(<ResourcePanel resource={resource}>{children}</ResourcePanel>);
  expect(screen.getByText('Nothing here yet.')).toBeTruthy();
});
