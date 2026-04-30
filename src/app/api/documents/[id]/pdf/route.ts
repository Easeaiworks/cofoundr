import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderDocumentPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 30;

const JURISDICTION_LABELS: Record<string, string> = {
  "CA-ON": "Ontario, Canada",
  "CA-BC": "British Columbia, Canada",
  "CA-AB": "Alberta, Canada",
  "CA-QC": "Quebec, Canada",
  "US-DE": "Delaware, USA",
  "US-CA": "California, USA",
  "US-TX": "Texas, USA",
  "US-FL": "Florida, USA",
  "US-NY": "New York, USA",
};

/**
 * GET /api/documents/:id/pdf
 *
 * Renders the document's content_md as a polished PDF. Auth + RLS-scoped:
 * only members of the workspace can fetch their own documents.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, kind, content_md, workspace_id")
    .eq("id", id)
    .maybeSingle();

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  type Doc = {
    id: string;
    title: string;
    kind: string;
    content_md: string | null;
    workspace_id: string;
  };
  const d = doc as Doc;

  const { data: ws } = await supabase
    .from("workspaces")
    .select("name, jurisdiction")
    .eq("id", d.workspace_id)
    .maybeSingle();

  type Ws = { name: string; jurisdiction: string | null };
  const w = (ws as Ws) ?? null;

  const buf = await renderDocumentPdf({
    title: d.title,
    subtitle: w?.name ? `Generated for ${w.name}` : undefined,
    workspaceName: w?.name,
    jurisdictionLabel: w?.jurisdiction
      ? JURISDICTION_LABELS[w.jurisdiction] ?? w.jurisdiction
      : undefined,
    preparedFor: user.email ?? undefined,
    body:
      d.content_md ?? "_This document has no content yet._\n\nGenerate it from the chat first.",
    documentKind: d.kind,
  });

  const filename = `${d.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
