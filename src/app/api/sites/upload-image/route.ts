/**
 * POST /api/sites/upload-image
 *
 * Multipart upload of a single image file for use in site blocks
 * (hero background, gallery items, etc.). Stored in the public `sites` bucket
 * under {workspace_id}/{site_id}/{nanoid}.ext.
 *
 * Limits: 5 MB max, image/* mime types only.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const QuerySchema = z.object({
  workspace_id: z.string().uuid(),
  site_id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    workspace_id: searchParams.get("workspace_id"),
    site_id: searchParams.get("site_id"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  // Auth-check: user must be member of the workspace AND the site must
  // belong to it (RLS handles both via the membership join).
  const { data: site } = await supabase
    .from("sites")
    .select("id, workspace_id")
    .eq("id", parsed.data.site_id)
    .maybeSingle();
  if (!site || (site as { workspace_id: string }).workspace_id !== parsed.data.workspace_id) {
    return NextResponse.json({ error: "Site not found" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (5 MB max)" }, { status: 413 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "png";
  const path = `${parsed.data.workspace_id}/${parsed.data.site_id}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;

  const admin = createAdminClient();
  await admin.storage.createBucket("sites", { public: true }).catch(() => null);

  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from("sites")
    .upload(path, buf, { contentType: file.type, upsert: false });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from("sites").getPublicUrl(path);
  return NextResponse.json({ url: pub.publicUrl, path });
}
