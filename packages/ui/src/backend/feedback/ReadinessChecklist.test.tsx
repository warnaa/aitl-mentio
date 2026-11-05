// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ReadinessChecklist } from './ReadinessChecklist';
afterEach(cleanup);
it('names completed and missing requirements and shows only relevant actions', () => {
  const { rerender } = render(
    <ReadinessChecklist
      items={[
        { key: 'bio', label: 'Description', met: false },
        { key: 'url', label: 'Public work', met: true },
      ]}
      actionsByKey={{ bio: <a href="#bio">Add description</a>, url: <a href="#url">Add work</a> }}
      title="Publish your page"
    />,
  );
  expect(screen.getByText('Required: Description')).toBeTruthy();
  expect(screen.getByText('Complete: Public work')).toBeTruthy();
  expect(screen.getAllByRole('link')).toHaveLength(1);
  rerender(<ReadinessChecklist items={[{ key: 'bio', label: 'Description', met: false }]} />);
  expect(screen.getByText('Before you publish')).toBeTruthy();
});
