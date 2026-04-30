import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Globe, ExternalLink, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listMyWorkspaces } from "@/lib/workspace";
import { readActiveWorkspaceCookie } from "@/lib/active-workspace";
import { createSiteAction } from "./actions";
import { publicEnv } from "@/lib/env";

export default async function SitesPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const workspaces = await listMyWorkspaces();
  if (workspaces.length === 0) redirect("/onboarding");

  const activeSlug = (await readActiveWorkspaceCookie()) ?? workspaces[0]!.slug;
  const ws = workspaces.find((w) => w.slug === activeSlug) ?? workspaces[0]!;

  const { data: sites } = await supabase
    .from("sites")
    .select("id, slug, name, tagline, published, created_at")
    .eq("workspace_id", ws.id)
    .order("created_at", { ascending: false });

  type SiteRow = {
    id: string;
    slug: string;
    name: string;
    tagline: string | null;
    published: boolean;
    created_at: string;
  };
  const list = (sites as SiteRow[] | null) ?? [];

  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-accent-100 bg-white">
        <div className="container max-w-5xl py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Link>
            <span className="text-ink-muted">/</span>
            <h1 className="text-lg font-semibold text-ink">Website</h1>
          </div>
          <p className="text-xs text-ink-muted">{ws.name}</p>
        </div>
      </header>

      <section className="container max-w-5xl py-8">
        {list.length === 0 ? (
          <CreateSiteCard workspaceId={ws.id} workspaceName={ws.name} />
        ) : (
          <div className="grid gap-3">
            {list.map((s) => (
              <SiteCard key={s.id} site={s} />
            ))}
            <CreateSiteCard
              workspaceId={ws.id}
              workspaceName={ws.name}
              compact
            />
          </div>
        )}
      </section>
    </main>
  );
}

function SiteCard({
  site,
}: {
  site: {
    id: string;
    slug: string;
    name: string;
    tagline: string | null;
    published: boolean;
  };
}) {
  const publicUrl = `${publicEnv.NEXT_PUBLIC_SITE_URL}/site/${site.slug}`;
  return (
    <div className="rounded-2xl border border-accent-100 bg-white p-5 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-accent" />
          <h3 className="text-base font-semibold text-ink truncate">{site.name}</h3>
          {site.published ? (
            <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700">
              Published
            </span>
          ) : (
            <span className="rounded-full bg-canvas border border-accent-100 px-2 py-0.5 text-[11px] text-ink-muted">
              Draft
            </span>
          )}
        </div>
        {site.tagline && (
          <p className="text-sm text-ink-muted mt-1 truncate">{site.tagline}</p>
        )}
        <p className="text-[11px] text-ink-muted mt-1 truncate">/site/{site.slug}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {site.published && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-accent-100 px-3 py-1.5 text-xs text-ink hover:bg-accent-50"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View
          </a>
        )}
        <Link
          href={`/sites/${site.id}`}
          className="rounded-md bg-accent text-white px-3 py-1.5 text-xs hover:bg-accent-400"
        >
          Edit
        </Link>
      </div>
    </div>
  );
}

function CreateSiteCard({
  workspaceId,
  workspaceName,
  compact,
}: {
  workspaceId: string;
  workspaceName: string;
  compact?: boolean;
}) {
  return (
    <form
      action={createSiteAction}
      className={
        compact
          ? "rounded-2xl border border-dashed border-accent-100 bg-white p-4 flex items-center justify-between gap-4"
          : "rounded-2xl border border-dashed border-accent bg-accent-50 p-8 text-center"
      }
    >
      <input type="hidden" name="workspace_id" value={workspaceId} />
      <input type="hidden" name="default_name" value={workspaceName} />
      {compact ? (
        <>
          <p className="text-sm text-ink">Add another website</p>
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-md bg-accent text-white px-3 py-1.5 text-xs hover:bg-accent-400"
          >
            <Plus className="h-3.5 w-3.5" /> New site
          </button>
        </>
      ) : (
        <>
          <Globe className="h-7 w-7 mx-auto text-accent" />
          <h3 className="mt-3 text-lg font-semibold text-ink">
            Spin up your first website
          </h3>
          <p className="mt-1 text-sm text-ink-muted max-w-md mx-auto">
            Cofoundr-hosted single-page site to start. Edit each section by
            chatting with your AI co-founder, or click Edit to open the markdown
            editor. Switch to a full WordPress install later if you outgrow it.
          </p>
          <button
            type="submit"
            className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-accent text-white px-4 py-2 text-sm hover:bg-accent-400"
          >
            <Plus className="h-4 w-4" /> Create site for {workspaceName}
          </button>
        </>
      )}
    </form>
  );
}
