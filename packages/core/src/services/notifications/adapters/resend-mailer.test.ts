import { inspect } from 'node:util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableError } from '../../../http/errors';

const state = vi.hoisted(() => ({ outboundLogger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));
// `fetchJson` logs failures through its own module-level logger; capture it.
vi.mock('../../../logger', () => ({ createLogger: () => state.outboundLogger }));

const { RESEND_EMAILS_URL, ResendMailer } = await import('./resend-mailer');

const fetchMock = vi.fn<typeof fetch>();
const API_KEY = 're_live_secret_key';
const message = {
  to: 'grace@devmentor.test',
  subject: 'Confirm your email',
  text: 'Open https://devmentor.example/api/auth/verify-email?token=secret-token',
};
const mailer = (env: { MAIL_API_KEY?: string; MAIL_FROM?: string } = { MAIL_API_KEY: API_KEY, MAIL_FROM: 'DevMentor <no-reply@devmentor.example>' }) =>
  new ResendMailer({ env });
const logged = () => inspect(state.outboundLogger.warn.mock.calls, { depth: Infinity });

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  state.outboundLogger.warn.mockReset();
});

describe('ResendMailer', () => {
  it('POSTs one JSON message to Resend with the bearer key', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: 'email_1' }), { status: 200 }));

    await expect(mailer().send(message)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(RESEND_EMAILS_URL);
    expect(RESEND_EMAILS_URL).toBe('https://api.resend.com/emails');
    expect(init).toMatchObject({
      method: 'POST',
      headers: { authorization: `Bearer ${API_KEY}`, 'content-type': 'application/json' },
    });
    expect(JSON.parse(init!.body as string)).toEqual({
      from: 'DevMentor <no-reply@devmentor.example>',
      to: ['grace@devmentor.test'],
      subject: 'Confirm your email',
      text: message.text,
    });
  });

  it('fails closed with a 503 when Resend refuses, logging neither the key nor the message', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'invalid from' }), { status: 422 }));

    await expect(mailer().send(message)).rejects.toBeInstanceOf(ServiceUnavailableError);
    expect(state.outboundLogger.warn).toHaveBeenCalledOnce();
    expect(logged()).toContain('422');
    for (const secret of [API_KEY, 'secret-token', 'grace@devmentor.test', 'Confirm your email']) {
      expect(logged()).not.toContain(secret);
    }
  });

  it('fails closed with a 503 when Resend does not answer in time', async () => {
    // Stand in for fetchJson's AbortSignal.timeout, so the test need not wait ten seconds.
    const clock = new AbortController();
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(clock.signal);
    fetchMock.mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason));
        }),
    );

    const sending = mailer().send(message);
    clock.abort(new DOMException('The operation timed out.', 'TimeoutError'));

    await expect(sending).rejects.toBeInstanceOf(ServiceUnavailableError);
    expect(timeout).toHaveBeenCalledWith(10_000);
    expect(logged()).toContain('timeout');
    expect(logged()).not.toContain(API_KEY);
    timeout.mockRestore();
  });

  it.each([
    ['no API key', { MAIL_FROM: 'DevMentor <no-reply@devmentor.example>' }],
    ['no sender', { MAIL_API_KEY: API_KEY }],
  ])('fails closed with a 503 and sends nothing when there is %s', async (_label, env) => {
    await expect(mailer(env).send(message)).rejects.toThrow(new ServiceUnavailableError('Email delivery is not configured.'));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
