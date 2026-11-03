import { pino, type Logger } from 'pino';
import { getEnv } from './config/env';

/**
 * Field paths censored in every log line, as a second line of defence: no code should
 * log these at all. Credentials (`password`, `passwordHash`, API keys, bearer and
 * cookie headers) one level deep or at the top.
 */
export const REDACTED_LOG_PATHS = [
  'password',
  'passwordHash',
  'apiKey',
  'authorization',
  'cookie',
  '*.password',
  '*.passwordHash',
  '*.apiKey',
  '*.authorization',
  '*.cookie',
  'headers.authorization',
  'headers.cookie',
  '*.headers.authorization',
  '*.headers.cookie',
];

/**
 * Root application logger. In development we keep raw JSON (no `pino-pretty` dep in
 * the base install); wire up a transport later if desired.
 */
export function createLogger(): Logger {
  const env = getEnv();
  return pino({
    level: env.LOG_LEVEL,
    base: { app: env.APP_NAME },
    redact: { paths: REDACTED_LOG_PATHS, censor: '[redacted]' },
  });
}

export type { Logger };
