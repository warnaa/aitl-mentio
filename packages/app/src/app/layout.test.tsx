import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';

const connection = vi.fn(async () => {});
vi.mock('next/server', () => ({ connection }));

const { default: RootLayout, metadata } = await import('./layout');

const render = () => RootLayout({ children: <p>page</p> }) as Promise<ReactElement<{ lang: string; children: ReactElement<{ children: ReactElement }> }>>;

beforeEach(() => {
  connection.mockClear();
});

describe('root layout', () => {
  it('waits for the request before rendering, so every page gets the CSP nonce (#83)', async () => {
    await render();
    expect(connection).toHaveBeenCalledOnce();
  });

  it('renders nothing when the page is being prerendered without a request', async () => {
    connection.mockRejectedValueOnce(new Error('prerender bailout'));
    await expect(render()).rejects.toThrow('prerender bailout');
  });

  it('renders the document around the page', async () => {
    const html = await render();
    expect(html.type).toBe('html');
    expect(html.props.lang).toBe('en');
    expect(html.props.children.type).toBe('body');
    expect(html.props.children.props.children).toEqual(<p>page</p>);
  });

  it('names the app in the document metadata', () => {
    expect(metadata).toMatchObject({ title: 'DevMentor' });
  });
});
