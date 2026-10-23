import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";
import { getEnv, getJwtSecret } from "../config/env";
import { ConfigError, ForbiddenError, UnauthorizedError } from "./errors";

export const SESSION_COOKIE_NAME = "mentio_session";

/**
 * 24h session. There is no refresh-token flow in MVP scope — users sign in again
 * after expiry (known limitation; do not lengthen the TTL to compensate).
 */
export const SESSION_TTL_SECONDS = 24 * 60 * 60;

const JWT_ALGORITHM = "HS256";

export const SESSION_ROLES = ["student", "mentor"] as const;
export type SessionRole = (typeof SESSION_ROLES)[number];

export interface Session {
  userId: string;
  role: SessionRole;
}

const sessionClaimsSchema = z.object({
  sub: z.uuid(),
  role: z.enum(SESSION_ROLES),
});

/** Flags for the session cookie. Preserve these whenever auth-cookie code changes. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: getEnv().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  } as const;
}

export function signSessionToken(session: Session): Promise<string> {
  return new SignJWT({ role: session.role })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getJwtSecret());
}

/**
 * Returns the verified session from the request cookie or throws
 * `UnauthorizedError`. Fails closed: any verification problem denies access.
 */
export async function requireSession(req: Request): Promise<Session> {
  const token = readCookie(req, SESSION_COOKIE_NAME);
  if (!token) throw new UnauthorizedError();

  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: [JWT_ALGORITHM] });
    const claims = sessionClaimsSchema.parse(payload);
    return { userId: claims.sub, role: claims.role };
  } catch (error) {
    // Misconfiguration is a server error (500) — still a denial, but not the user's fault.
    if (error instanceof ConfigError) throw error;
    throw new UnauthorizedError("Invalid or expired session", { cause: error });
  }
}

export function requireRole(session: Session, role: SessionRole): void {
  if (session.role !== role) throw new ForbiddenError();
}

/** Ownership check for a specific record. A missing owner is a denial, never an allow. */
export function assertOwner(session: Session, ownerId: string | null | undefined): void {
  if (!ownerId || ownerId !== session.userId) throw new ForbiddenError();
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie");
  if (!header) return undefined;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return undefined;
}
