/**
 * Helpers for tracking which of a user's (up to 3) workspaces is "active"
 * in the dashboard. We use a simple HTTP-only cookie so the choice persists
 * across page reloads, but the URL ?w= override always wins for shareability.
 */
import "server-only";
import { cookies } from "next/headers";

const COOKIE = "cofoundr_w";

export async function readActiveWorkspaceCookie(): Promise<string | null> {
  const c = await cookies();
  return c.get(COOKIE)?.value ?? null;
}

export async function writeActiveWorkspaceCookie(slug: string) {
  const c = await cookies();
  c.set(COOKIE, slug, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}

export async function clearActiveWorkspaceCookie() {
  const c = await cookies();
  c.delete(COOKIE);
}
