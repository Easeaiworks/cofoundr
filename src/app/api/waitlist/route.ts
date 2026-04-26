import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z.string().email().max(254),
  full_name: z.string().max(120).optional(),
  intent: z.enum(["starting", "running", "agency"]).optional(),
  jurisdiction: z.string().max(20).optional(),
});

/**
 * Public waitlist signup. RLS lets `anon` insert; selects are blocked.
 * We rely on the `unique(email)` constraint — duplicates return 200 OK so the
 * UX is identical for "first signup" and "already signed up", and we don't leak
 * a list of emails to anyone probing the endpoint.
 */
export async function POST(req: NextRequest) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("waitlist").insert({
    email: body.email.toLowerCase().trim(),
    full_name: body.full_name ?? null,
    intent: body.intent ?? null,
    jurisdiction: body.jurisdiction ?? null,
    metadata: {
      ua: req.headers.get("user-agent")?.slice(0, 256) ?? null,
      ref: req.headers.get("referer")?.slice(0, 512) ?? null,
    },
  });

  // 23505 = unique violation → already signed up. Treat as success.
  if (error && !String(error.code).startsWith("23")) {
    return NextResponse.json({ error: "Could not save signup" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
