import { ConfigError } from "../errors";

type Env = Record<string, string | undefined>;

export function readEnv(name: string, fallback?: string, env: Env = process.env): string {
  const value = env[name];
  if (value !== undefined && value !== "") return value;
  if (fallback !== undefined) return fallback;
  throw new ConfigError(`Missing required environment variable ${name}`);
}

export function readIntEnv(name: string, fallback?: number, env: Env = process.env): number {
  const raw = env[name];
  if (raw === undefined || raw === "") {
    if (fallback !== undefined) return fallback;
    throw new ConfigError(`Missing required environment variable ${name}`);
  }
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) {
    throw new ConfigError(`Environment variable ${name} must be an integer, got "${raw}"`);
  }
  return value;
}
