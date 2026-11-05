// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SessionIsTextNotice } from './SessionIsTextNotice';

afterEach(cleanup);
it('states the shared text channel and no-speed promise exactly', () => {
  render(<SessionIsTextNotice />);
  expect(screen.getByText('Sessions are text. DevMentor makes no promise about how soon an answer arrives.')).toBeTruthy();
});
