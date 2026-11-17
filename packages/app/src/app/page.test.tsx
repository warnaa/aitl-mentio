import { beforeEach, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Session } from '@devmentor/core';
import { PublicPage } from '../components/public/PublicPage';
import { findAll, findAllByType, findByType, textOf } from '../test/element-tree';

const mocks = vi.hoisted(() => ({ getPageSession: vi.fn<() => Promise<Session | null>>(), warn: vi.fn() }));
vi.mock('../lib/session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/session')>()),
  getPageSession: mocks.getPageSession,
}));
vi.mock('../lib/sign-in', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/sign-in')>()),
  authRouteLogger: () => ({ warn: mocks.warn }),
}));
const { default: Home, dynamic } = await import('./page');

const render = async () => (await Home()) as ReactElement;
const links = (tree: unknown) =>
  findAllByType(tree as ReactElement, Link).map((link) => `${textOf(link.props.children)} ${String(link.props.href)}`);
const headings = (tree: ReactElement) =>
  findAll(tree, (element) => ['h1', 'h2', 'h3'].includes(element.type as string)).map((heading) => textOf(heading));

beforeEach(() => {
  mocks.getPageSession.mockReset();
  mocks.getPageSession.mockResolvedValue(null);
});

it('composes the s17 sections in order inside the landing frame', async () => {
  expect(dynamic).toBe('force-dynamic');
  const tree = await render();
  const frame = findByType(tree, PublicPage);
  expect(frame.props.className).toBe('dm-public-landing');
  // Document order: the answer illustration precedes its copy, as in the prototype.
  expect(headings(frame.props.children as ReactElement)).toEqual([
    'Work through your code with a mentor.',
    'Talk through the part you are stuck on.',
    'Understand what is happening and what to change.',
    'A clearer result type at the API boundary',
    'Return to the explanation when you need it.',
    'Book a session for your question.',
    'Choose a mentor',
    'Choose a time',
    'Discuss your code',
    'Find a mentor for the problem you are working on.',
  ]);
  expect(findByType(tree, Image).props).toMatchObject({ src: '/landing/developer-mentoring.png', alt: '' });
});

it('leads signed-out visitors to registration and sign-in, and to the public mentor list', async () => {
  const tree = await render();
  const frame = findByType(tree, PublicPage);
  expect(links(frame.props.primary)).toEqual(['Create an account /register']);
  expect(links(frame.props.footer)).toEqual(['Sign in /sign-in']);
  expect(links(frame.props.children)).toEqual(['Create an account /register', 'Browse mentors /mentors', 'Create an account /register', 'Browse mentors /mentors', 'Already have an account? Sign in /sign-in']);
  expect(textOf(tree)).not.toMatch(/Find your mentor|Meet Alex/);
});

it('offers a signed-in visitor their workspace and leaves the header to the frame', async () => {
  mocks.getPageSession.mockResolvedValue({ userId: 'u1', roles: ['mentee', 'mentor'] });
  const tree = await render();
  const frame = findByType(tree, PublicPage);
  expect(frame.props.primary).toBeUndefined();
  expect(links(frame.props.footer)).toEqual(['My workspace /mentor']);
  expect(links(frame.props.children)).toEqual(['Open my workspace /mentor', 'Browse mentors /mentors', 'Browse mentors /mentors', 'Open my workspace /mentor']);
});
