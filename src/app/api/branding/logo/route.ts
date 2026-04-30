import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateLogos, buildLogoPrompt } from "@/lib/replicate";

export const runtime = "nodejs";
export const maxDuration = 60;

const DAILY_LIMIT = 5;

const BodySchema = z.object({
  workspace_id: z.string().uuid(),
  brand_name: z.string().min(2).max(80),
  industry: z.string().max(80).optional(),
  vibe: z.string().max(160).optional(),
  color_hint: z.string().max(120).optional(),
  style: z.string().max(120).optional(),
  variants: z.number().min(1).max(4).default(4),
});

/**
 * POST /api/branding/logo
 *
 * Generates `variants` logo concepts via Replicate Flux Schnell, downloads
 * the resulting images, uploads them to Supabase Storage (`branding` bucket),
 * and inserts a `documents` row per logo with `kind: 'logo'`. Returns the
 * public URLs so the UI can display them.
 *
 * Daily cap per workspace enforced via `workspaces.logo_gens_today`.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Membership check + daily cap (RLS-respecting).
  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, name, logo_gens_today, logo_gens_reset_at")
    .eq("id", body.workspace_id)
    .maybeSingle();
  if (!ws) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 403 });
  }
  type Ws = {
    id: string;
    name: string;
    logo_gens_today: number;
    logo_gens_reset_at: string | null;
  };
  const w = ws as Ws;

  const admin = createAdminClient();

  // Reset daily counter if it's been >= 24 hours since last reset.
  let used = w.logo_gens_today ?? 0;
  const lastReset = w.logo_gens_reset_at ? new Date(w.logo_gens_reset_at) : null;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (!lastReset || lastReset < oneDayAgo) {
    used = 0;
    await admin
      .from("workspaces")
      .update({ logo_gens_today: 0, logo_gens_reset_at: new Date().toISOString() })
      .eq("id", w.id);
  }

  if (used + body.variants > DAILY_LIMIT) {
    return NextResponse.json(
      {
        error: `Daily logo cap reached (${used}/${DAILY_LIMIT}). Resets in 24h.`,
      },
      { status: 429 }
    );
  }

  // ----- Generate via Replicate ----------------------------------------
  const prompt = buildLogoPrompt({
    brandName: body.brand_name,
    industry: body.industry,
    vibe: body.vibe,
    colorHint: body.color_hint,
    style: body.style,
  });

  let outputUrls: string[];
  try {
    outputUrls = await generateLogos({ prompt, num_outputs: body.variants });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generation failed" },
      { status: 500 }
    );
  }

  // ----- Download + upload to Supabase Storage --------------------------
  // Bucket creation is idempotent on first call; we use 'branding' bucket.
  await admin.storage
    .createBucket("branding", { public: true })
    .catch(() => null);

  const saved: { url: string; document_id: string }[] = [];
  for (let i = 0; i < outputUrls.length; i++) {
    const url = outputUrls[i]!;
    try {
      const r = await fetch(url);
      const arr = await r.arrayBuffer();
      const path = `${w.id}/${Date.now()}-${i}.png`;
      const { error: upErr } = await admin.storage
        .from("branding")
        .upload(path, Buffer.from(arr), {
          contentType: "image/png",
          upsert: false,
        });
      if (upErr) continue;
      const { data: pub } = admin.storage.from("branding").getPublicUrl(path);

      const { data: docRow } = await admin
        .from("documents")
        .insert({
          workspace_id: w.id,
          title: `${body.brand_name} — logo concept ${i + 1}`,
          kind: "logo",
          storage_path: path,
          metadata: { prompt, source: "replicate-flux-schnell", variant: i + 1 },
        })
        .select("id")
        .single();

      saved.push({
        url: pub.publicUrl,
        document_id: (docRow as { id: string } | null)?.id ?? "",
      });
    } catch {
      // continue on individual failure
    }
  }

  // Increment counter.
  await admin
    .from("workspaces")
    .update({ logo_gens_today: used + saved.length })
    .eq("id", w.id);

  // Audit.
  await admin.from("audit_log").insert({
    workspace_id: w.id,
    actor_id: user.id,
    action: "branding.logo.generate",
    target_type: "workspace",
    target_id: w.id,
    payload: { count: saved.length, prompt: prompt.slice(0, 500) },
  });

  return NextResponse.json({ logos: saved, used: used + saved.length, limit: DAILY_LIMIT });
}
