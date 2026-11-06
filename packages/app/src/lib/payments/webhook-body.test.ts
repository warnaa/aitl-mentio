import { expect, it } from 'vitest';
import { MAX_WEBHOOK_BYTES, readWebhookBody } from './webhook-body';
const request = (body: BodyInit | null, headers: Record<string, string> = {}) => new Request('http://test', { method: 'POST', body, headers, duplex: 'half' } as RequestInit);
it('preserves exact bytes across chunks and accepts bounded declared length', async () => {
  expect(await readWebhookBody(request(' {"signed":true} ', { 'content-length': '17' }))).toBe(' {"signed":true} ');
  const stream = new ReadableStream({ start(c) { c.enqueue(new Uint8Array([0xc3])); c.enqueue(new Uint8Array([0xa9])); c.close(); } });
  expect(await readWebhookBody(request(stream))).toBe('é');
});
it('rejects invalid lengths, absent body, oversized chunked data and invalid UTF8', async () => {
  for (const length of ['bad', String(MAX_WEBHOOK_BYTES + 1)]) await expect(readWebhookBody(request('{}', { 'content-length': length }))).rejects.toMatchObject({ status: 400 });
  await expect(readWebhookBody(request(null))).rejects.toMatchObject({ status: 400 });
  await expect(readWebhookBody(request('x'.repeat(MAX_WEBHOOK_BYTES + 1)))).rejects.toMatchObject({ status: 400 });
  await expect(readWebhookBody(request(new Uint8Array([255])))).rejects.toMatchObject({ status: 400 });
  const stream = new ReadableStream({ start(c) { c.error(new Error('read failed')); } });
  await expect(readWebhookBody(request(stream))).rejects.toMatchObject({ status: 400 });
});
