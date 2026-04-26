/**
 * Server-side Supabase client (RLS-respecting, user-scoped).
 *
 * Use in server components, route handlers, and server actions.
 * Cookies flow through Next.js so the user's auth session is honored
 * and Postgres RLS policies see the right `auth.uid()`.
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a server component — set cookies via middleware instead.
          }
        },
      },
    }
  );
}

/**
 * Admin client — bypasses RLS. ONLY use this in privileged server-side code paths
 * (e.g. webhooks, scheduled jobs, tenant provisioning). Never expose to a request
 * that originates from a user session without explicit authorization checks.
 */
import { createClient as createAdminSupabase } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

export function createAdminClient() {
  const env = getServerEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Admin client unavailable."
    );
  }
  return createAdminSupabase<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
