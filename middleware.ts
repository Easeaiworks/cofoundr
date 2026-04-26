import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Edge middleware:
 *   1. Redirects requests on the working domain to the canonical site.
 *      (Today: cofoundr.com, .studio, .org → cofoundr.ca.
 *       When .com is acquired, flip CANONICAL_HOST in NEXT_PUBLIC_SITE_URL.)
 *   2. Refreshes the Supabase auth session.
 */
export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const canonical = new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://cofoundr.ca"
  );

  // 1. Canonical-host redirect (skip in dev / vercel preview / localhost).
  const isLocal =
    url.hostname === "localhost" ||
    url.hostname.endsWith(".vercel.app") ||
    url.hostname.endsWith(".local");

  if (!isLocal && url.hostname !== canonical.hostname) {
    const redirected = new URL(request.url);
    redirected.hostname = canonical.hostname;
    redirected.protocol = canonical.protocol;
    redirected.port = canonical.port;
    return NextResponse.redirect(redirected, 308);
  }

  // 2. Supabase session refresh.
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on everything except Next.js internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
