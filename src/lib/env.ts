/**
 * Typed env access.
 *
 * Validate at the boundary so callers can rely on `string` (not `string | undefined`)
 * and we fail at startup if a critical var is missing in production.
 */
import { z } from "zod";

const PublicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SITE_NAME: z.string().min(1).default("Cofoundr"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

const ServerEnvSchema = PublicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-").optional(),
  ANTHROPIC_MODEL_DEFAULT: z.string().default("claude-sonnet-4-6"),
  ANTHROPIC_MODEL_STRATEGY: z.string().default("claude-opus-4-6"),
  ANTHROPIC_MODEL_FAST: z.string().default("claude-haiku-4-5-20251001"),
  VOYAGE_API_KEY: z.string().optional(),
  VOYAGE_MODEL: z.string().default("voyage-3-large"),
  REPLICATE_API_TOKEN: z.string().optional(),
  REPLICATE_LOGO_MODEL: z.string().default("black-forest-labs/flux-schnell"),
  STRIPE_SECRET_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

// Eagerly validate the public subset (safe to read on both server and client).
export const publicEnv = PublicEnvSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

// Server env — call this from server components / route handlers / server actions only.
let _serverEnv: z.infer<typeof ServerEnvSchema> | null = null;
export function getServerEnv() {
  if (_serverEnv) return _serverEnv;
  _serverEnv = ServerEnvSchema.parse(process.env);
  return _serverEnv;
}
