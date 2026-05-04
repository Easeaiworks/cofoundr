/**
 * POST /api/sites/blocks/draft
 *
 * Generates fresh AI content for a single site block based on the
 * workspace's brand context. Used by the editor's "Draft this" button.
 *
 * Strict JSON output, no markdown, validated with Zod before returning.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, pickModel } from "@/lib/anthropic";
import {
  BlockTypes,
  HeroPropsSchema,
  FeaturesPropsSchema,
  CtaPropsSchema,
  TestimonialsPropsSchema,
  type BlockType,
} from "@/lib/site-blocks";

export const runtime = "nodejs";
export const maxDuration = 30;

const BodySchema = z.object({
  workspace_id: z.string().uuid(),
  page_title: z.string().min(1).max(120),
  block_type: z.enum(BlockTypes),
  hint: z.string().max(400).optional(),
});

const PROMPT_BY_TYPE: Record<BlockType, string> = {
  hero: `Return ONLY a JSON object matching this exact shape:
{ "eyebrow": string, "headline": string, "subhead": string, "ctaPrimaryText": string, "ctaPrimaryHref": "#contact" }
Headline: punchy, 6-12 words. Subhead: one sentence, value prop. Eyebrow: 2-3 words.`,
  rich_text: `Return ONLY a JSON object: { "markdown": string }. The markdown is one focused section ~120-200 words. Use a single ## heading then prose. Sound like a real founder, not corporate filler.`,
  features: `Return ONLY a JSON object: { "title": string, "intro": string, "items": [{ "title": string, "description": string }, ...] } with exactly 3 items. Title 4-6 words. Intro one sentence. Each item title 2-4 words, description 1 sentence.`,
  cta: `Return ONLY a JSON object: { "headline": string, "body": string, "ctaText": string, "ctaHref": "#contact" }. Headline 6-10 words, action-oriented. Body one sentence. ctaText 2-4 words.`,
  gallery: `Return ONLY a JSON object: { "title": string, "images": [] }. Title only; images stay empty (the user uploads their own).`,
  testimonials: `Return ONLY a JSON object: { "title": string, "items": [{ "quote": string, "author": string, "role": string }, ...] } with exactly 3 placeholder items. Make the quotes plausible and the names diverse fictional placeholders the user can replace.`,
};

const SCHEMA_BY_TYPE: Partial<Record<BlockType, z.ZodTypeAny>> = {
  hero: HeroPropsSchema,
  features: FeaturesPropsSchema,
  cta: CtaPropsSchema,
  testimonials: TestimonialsPropsSchema,
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, name, jurisdiction")
    .eq("id", body.workspace_id)
    .maybeSingle();
  if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 403 });
  type Ws = { id: string; name: string; jurisdiction: string | null };
  const w = ws as Ws;

  const { data: idea } = await supabase
    .from("business_ideas")
    .select("metadata")
    .eq("workspace_id", w.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  type Idea = { metadata: Record<string, string> };
  const ideaMeta = (idea as Idea | null)?.metadata ?? {};

  const brandContext = [
    `Brand name: ${w.name}.`,
    w.jurisdiction ? `Jurisdiction: ${w.jurisdiction}.` : "",
    ideaMeta.interests ? `What they do: ${ideaMeta.interests}.` : "",
    ideaMeta.online_or_local ? `Reach: ${ideaMeta.online_or_local}.` : "",
    ideaMeta.product_or_service ? `Offer type: ${ideaMeta.product_or_service}.` : "",
    body.hint ? `Author hint for this block: ${body.hint}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const anthropic = getAnthropic();
  const model = pickModel("default");

  const resp = await anthropic.messages.create({
    model,
    max_tokens: 800,
    system:
      "You write website copy for first-time founders. Concise, concrete, no jargon, no AI tells. Output strict JSON only — no markdown fences, no commentary.",
    messages: [
      {
        role: "user",
        content: `${brandContext}\n\nBlock type: ${body.block_type}. Page: ${body.page_title}.\n\n${PROMPT_BY_TYPE[body.block_type]}`,
      },
    ],
  });

  const text =
    resp.content[0]?.type === "text" ? resp.content[0].text.trim() : "";

  // Strip code fences if model added them defensively.
  const json = text.replace(/^```(?:json)?\s*|\s*```$/g, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return NextResponse.json(
      { error: "Model returned non-JSON. Try again." },
      { status: 502 }
    );
  }

  const schema = SCHEMA_BY_TYPE[body.block_type];
  if (schema) {
    const z = schema.safeParse(parsed);
    if (!z.success) {
      return NextResponse.json(
        { error: "Generated content didn't match schema. Try again." },
        { status: 502 }
      );
    }
    parsed = z.data;
  }

  return NextResponse.json({ props: parsed, ai_drafted_at: new Date().toISOString() });
}
