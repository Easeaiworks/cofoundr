/**
 * Database types — placeholder.
 *
 * Once you've applied the initial migration (see supabase/migrations/),
 * regenerate this file with:
 *
 *     npx supabase gen types typescript --project-id YOUR_REF > src/types/database.ts
 *
 * Until then, this `any`-loose typing keeps the build green without lying about
 * the schema.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Loose placeholder. After applying the migration, regenerate via:
//   npx supabase gen types typescript --project-id YOUR_REF > src/types/database.ts
// At that point the queries become fully typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
