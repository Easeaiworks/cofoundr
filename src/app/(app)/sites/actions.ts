"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { normalizeSlug } from "@/lib/workspace";
import { defaultHomePageBlocks, PageBlocksSchema } from "@/lib/site-blocks";

const CreateSiteSchema = z.object({
  workspace_id: z.string().uuid(),
  default_name: z.string().min(1).max(80),
});

export async function createSiteAction(formData: FormData) {
  const parsed = CreateSiteSchema.safeParse({
    workspace_id: formData.get("workspace_id"),
    default_name: formData.get("default_name"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Membership verified by RLS
  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, name, jurisdiction")
    .eq("id", parsed.data.workspace_id)
    .maybeSingle();
  if (!ws) return;

  const w = ws as { id: string; name: string; jurisdiction: string | null };

  // Generate a globally-unique slug
  const baseSlug = normalizeSlug(parsed.data.default_name);
  let slug = baseSlug;
  for (let i = 0; i < 5; i++) {
    const { data: collision } = await supabase
      .from("sites")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!collision) break;
    slug = `${baseSlug}-${Math.floor(Math.random() * 9000 + 1000)}`;
  }

  const admin = createAdminClient();
  const { data: site, error: siteErr } = await admin
    .from("sites")
    .insert({
      workspace_id: w.id,
      slug,
      name: w.name,
      tagline: "Coming soon — built with Cofoundr",
      primary_color: "#1F3A8A",
      font_pair: "inter|merriweather",
      published: false,
    })
    .select("id")
    .single();

  if (siteErr || !site) return;

  const siteId = (site as { id: string }).id;

  // Default pages — block-based now.
  const homeBlocks = defaultHomePageBlocks(w.name);
  const aboutBlocks = [
    {
      id: crypto.randomUUID(),
      type: "rich_text" as const,
      props: { markdown: `# About ${w.name}\n\nTell your story here.` },
    },
  ];
  const contactBlocks = [
    {
      id: crypto.randomUUID(),
      type: "cta" as const,
      props: {
        headline: "Get in touch",
        body: "We'd love to hear from you.",
        ctaText: "Email us",
        ctaHref: `mailto:hello@${slug}.com`,
      },
    },
  ];

  await admin.from("site_pages").insert([
    {
      site_id: siteId,
      slug: "home",
      title: "Home",
      meta_description: `Welcome to ${w.name}.`,
      content_blocks: homeBlocks,
      position: 0,
      is_home: true,
    },
    {
      site_id: siteId,
      slug: "about",
      title: "About",
      meta_description: `About ${w.name}.`,
      content_blocks: aboutBlocks,
      position: 1,
      is_home: false,
    },
    {
      site_id: siteId,
      slug: "contact",
      title: "Contact",
      meta_description: `Contact ${w.name}.`,
      content_blocks: contactBlocks,
      position: 2,
      is_home: false,
    },
  ]);

  revalidatePath("/sites");
  redirect(`/sites/${siteId}`);
}

const UpdatePageSchema = z.object({
  page_id: z.string().uuid(),
  title: z.string().min(1).max(160),
  meta_description: z.string().max(300).optional(),
  content_md: z.string().max(50_000),
});

export async function updateSitePageAction(formData: FormData) {
  const parsed = UpdatePageSchema.safeParse({
    page_id: formData.get("page_id"),
    title: formData.get("title"),
    meta_description: formData.get("meta_description") ?? "",
    content_md: formData.get("content_md") ?? "",
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // RLS-scoped update; update fails if user isn't a workspace member.
  await supabase
    .from("site_pages")
    .update({
      title: parsed.data.title,
      meta_description: parsed.data.meta_description ?? null,
      content_md: parsed.data.content_md,
    })
    .eq("id", parsed.data.page_id);

  revalidatePath("/sites");
}

// New block-based update for pages. Replaces updateSitePageAction for the
// upgraded editor. Old action kept around for back-compat in case anything
// still references it.
const UpdateBlocksSchema = z.object({
  page_id: z.string().uuid(),
  blocks: z.string(), // stringified JSON array of blocks
});

export async function updateSitePageBlocksAction(formData: FormData) {
  const parsed = UpdateBlocksSchema.safeParse({
    page_id: formData.get("page_id"),
    blocks: formData.get("blocks"),
  });
  if (!parsed.success) return;

  let blocks: unknown;
  try {
    blocks = JSON.parse(parsed.data.blocks);
  } catch {
    return;
  }
  const valid = PageBlocksSchema.safeParse(blocks);
  if (!valid.success) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("site_pages")
    .update({ content_blocks: valid.data })
    .eq("id", parsed.data.page_id);

  revalidatePath("/sites");
}

const UpdateSettingsSchema = z.object({
  site_id: z.string().uuid(),
  theme_key: z.string().max(40).optional(),
  primary_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  secondary_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export async function updateSiteSettingsAction(formData: FormData) {
  const parsed = UpdateSettingsSchema.safeParse({
    site_id: formData.get("site_id"),
    theme_key: formData.get("theme_key") ?? undefined,
    primary_color: formData.get("primary_color") ?? undefined,
    secondary_color: formData.get("secondary_color") ?? undefined,
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const update: Record<string, string> = {};
  if (parsed.data.theme_key) update.theme_key = parsed.data.theme_key;
  if (parsed.data.primary_color) update.primary_color = parsed.data.primary_color;
  if (parsed.data.secondary_color) update.secondary_color = parsed.data.secondary_color;

  if (Object.keys(update).length === 0) return;

  await supabase.from("sites").update(update).eq("id", parsed.data.site_id);
  revalidatePath("/sites");
}

const TogglePublishSchema = z.object({
  site_id: z.string().uuid(),
  published: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export async function togglePublishAction(formData: FormData) {
  const parsed = TogglePublishSchema.safeParse({
    site_id: formData.get("site_id"),
    published: formData.get("published"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("sites")
    .update({ published: parsed.data.published })
    .eq("id", parsed.data.site_id);

  revalidatePath("/sites");
}
