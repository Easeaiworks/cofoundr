import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicSite } from "@/components/public-site";
import type { Block } from "@/lib/site-blocks";

export default async function PublicSiteHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: site } = await supabase
    .from("sites")
    .select(
      "id, slug, name, tagline, primary_color, secondary_color, theme_key, published"
    )
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (!site) notFound();
  type Site = {
    id: string;
    slug: string;
    name: string;
    tagline: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    theme_key: string;
    published: boolean;
  };
  const s = site as Site;

  const { data: pages } = await supabase
    .from("site_pages")
    .select("id, slug, title, content_md, content_blocks, is_home, position")
    .eq("site_id", s.id)
    .order("position", { ascending: true });

  type Page = {
    id: string;
    slug: string;
    title: string;
    content_md: string | null;
    content_blocks: Block[] | null;
    is_home: boolean;
  };
  const allPages = (pages as Page[] | null) ?? [];
  const home = allPages.find((p) => p.is_home) ?? allPages[0];
  if (!home) notFound();

  const blocks: Block[] =
    home.content_blocks && home.content_blocks.length > 0
      ? home.content_blocks
      : home.content_md
      ? [
          {
            id: "legacy-1",
            type: "rich_text",
            props: { markdown: home.content_md },
          } as Block,
        ]
      : [];

  return (
    <PublicSite
      site={s}
      pages={allPages.map((p) => ({ slug: p.slug, title: p.title, is_home: p.is_home }))}
      active={home.slug}
      blocks={blocks}
    />
  );
}
