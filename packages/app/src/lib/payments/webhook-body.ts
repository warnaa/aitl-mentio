import { BadRequestError } from '@devmentor/core';
export const MAX_WEBHOOK_BYTES = 256 * 1024;

/** Bound bytes while reading, including chunked requests without Content-Length. */
export async function readWebhookBody(req: Request): Promise<string> {
  const length = req.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_WEBHOOK_BYTES)) throw new BadRequestError('Invalid webhook size');
  if (!req.body) throw new BadRequestError('Missing webhook body');
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_WEBHOOK_BYTES) {
        await reader.cancel();
        throw new BadRequestError('Webhook body too large');
      }
      chunks.push(value);
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
  } catch { throw new BadRequestError('Invalid webhook body'); }
  finally { reader.releaseLock(); }
}
