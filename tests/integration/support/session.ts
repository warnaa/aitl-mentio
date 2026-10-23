import { SESSION_COOKIE_NAME, signSessionToken } from "@mentio/core/http";

export async function sessionCookie(userId: string) {
  return { name: SESSION_COOKIE_NAME, value: await signSessionToken({ userId, role: "student" }) };
}
