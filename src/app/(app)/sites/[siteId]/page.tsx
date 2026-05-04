import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { togglePublishAction } from "../actions";
import { SitePageEditor } from "./editor";
import type { Block } from "@/lib/site-blocks";

export default async function SiteEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { siteId } = await params;
  const { p: pageSlugParam } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: site } = await supabase
    .from("sites")
    .select(
      "id, slug, name, tagline, published, workspace_id, theme_key, primary_color, secondary_color"
    )
    .eq("id", siteId)
    .maybeSingle();
  if (!site) notFound();
  type Site = {
    id: string;
    slug: string;
    name: string;
    tagline: string | null;
    published: boolean;
    workspace_id: string;
    theme_key: string;
    primary_color: string | null;
    secondary_color: string | null;
  };
  const s = site as Site;

  const { data: pages } = await supabase
    .from("site_pages")
    .select(
      "id, slug, title, meta_description, content_md, content_blocks, position, is_home"
    )
    .eq("site_id", siteId)
    .order("position", { ascending: true });

  type Page = {
    id: string;
    slug: string;
    title: string;
    meta_description: string | null;
    content_md: string | null;
    content_blocks: Block[] | null;
    position: number;
    is_home: boolean;
  };
  const allPages = (pages as Page[] | null) ?? [];
  if (allPages.length === 0) notFound();

  const activePage =
    allPages.find((p) => p.slug === pageSlugParam) ??
    allPages.find((p) => p.is_home) ??
    allPages[0]!;

  // If the page hasn't been migrated to blocks yet, synthesize a single
  // rich_text block from content_md so the editor still loads.
  const blocks: Block[] =
    activePage.content_blocks && activePage.content_blocks.length > 0
      ? activePage.content_blocks
      : activePage.content_md
      ? [
          {
            id: crypto.randomUUID(),
            type: "rich_text",
            props: { markdown: activePage.content_md },
          } as Block,
        ]
      : [];

  const publicUrl = `${publicEnv.NEXT_PUBLIC_SITE_URL}/site/${s.slug}`;

  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-accent-100 bg-white">
        <div className="container max-w-6xl py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/sites"
              className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink shrink-0"
            >
              <ArrowLeft className="h-4 w-4" /> Sites
            </Link>
            <span className="text-ink-muted">/</span>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-ink truncate">{s.name}</h1>
              <p className="text-[11px] text-ink-muted truncate">/site/{s.slug}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-accent-100 px-3 py-1.5 text-xs text-ink hover:bg-accent-50"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View
            </a>

            <form action={togglePublishAction}>
              <input type="hidden" name="site_id" value={s.id} />
              <input
                type="hidden"
                name="published"
                value={s.published ? "false" : "true"}
              />
              <button
                type="submit"
                className={
                  s.published
                    ? "rounded-md border border-accent-100 px-3 py-1.5 text-xs text-ink hover:bg-accent-50"
                    : "rounded-md bg-accent text-white px-3 py-1.5 text-xs hover:bg-accent-400"
                }
              >
                {s.published ? "Unpublish" : "Publish"}
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="container max-w-6xl py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
          <aside className="rounded-2xl border border-accent-100 bg-white p-2 self-start">
            <p className="px-2 pt-1 pb-2 text-[10px] uppercase tracking-wider text-ink-muted">
              Pages
            </p>
            <ul className="space-y-0.5">
              {allPages.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/sites/${s.id}?p=${p.slug}`}
                    className={
                      "block rounded-md px-2.5 py-1.5 text-sm " +
                      (p.id === activePage.id
                        ? "bg-accent-50 text-accent font-medium"
                        : "text-ink hover:bg-accent-50")
                    }
                  >
                    {p.title}
                    {p.is_home && (
                      <span className="ml-1 text-[10px] text-ink-muted">home</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>

          <SitePageEditor
            site={{
              id: s.id,
              slug: s.slug,
              name: s.name,
              workspace_id: s.workspace_id,
              theme_key: s.theme_key,
              primary_color: s.primary_color,
              secondary_color: s.secondary_color,
            }}
            page={{
              id: activePage.id,
              slug: activePage.slug,
              title: activePage.title,
              content_blocks: blocks,
              is_home: activePage.is_home,
            }}
            workspaceTitle={s.name}
          />
        </div>
      </section>
    </main>
  );
}
