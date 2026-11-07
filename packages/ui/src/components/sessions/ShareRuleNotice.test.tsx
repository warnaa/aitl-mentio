// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ShareRuleNotice } from './ShareRuleNotice';

afterEach(cleanup);
it('states the paste-only-what-you-may-share rule exactly', () => {
  render(<ShareRuleNotice />);
  expect(screen.getByText('Paste only what you are allowed to share. DevMentor does not check who owns it.')).toBeTruthy();
});
