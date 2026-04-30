import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listMyWorkspaces } from "@/lib/workspace";
import { readActiveWorkspaceCookie } from "@/lib/active-workspace";
import { LogoGenerator } from "./logo-generator";

export default async function BrandingPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const workspaces = await listMyWorkspaces();
  if (workspaces.length === 0) redirect("/onboarding");

  const activeSlug = (await readActiveWorkspaceCookie()) ?? workspaces[0]!.slug;
  const ws = workspaces.find((w) => w.slug === activeSlug) ?? workspaces[0]!;

  // Existing logos for this workspace
  const { data: existing } = await supabase
    .from("documents")
    .select("id, title, storage_path, metadata, created_at")
    .eq("workspace_id", ws.id)
    .eq("kind", "logo")
    .order("created_at", { ascending: false })
    .limit(20);

  type LogoRow = {
    id: string;
    title: string;
    storage_path: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  };
  const logos = (existing as LogoRow[] | null) ?? [];

  // Build public URLs for the existing logos (admin client not needed if bucket is public)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const logoItems = logos.map((l) => ({
    id: l.id,
    title: l.title,
    url: l.storage_path
      ? `${supabaseUrl}/storage/v1/object/public/branding/${l.storage_path}`
      : null,
    created_at: l.created_at,
  }));

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
            <h1 className="text-lg font-semibold text-ink">Branding kit</h1>
          </div>
          <p className="text-xs text-ink-muted">{ws.name}</p>
        </div>
      </header>

      <section className="container max-w-5xl py-8 space-y-8">
        <div>
          <p className="text-xs uppercase tracking-wider text-accent flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" /> Logo generator
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">
            Generate 4 logo concepts in seconds
          </h2>
          <p className="mt-1 text-sm text-ink-muted max-w-2xl">
            Cofoundr uses Replicate&rsquo;s Flux Schnell model to draft logo
            ideas based on your brand name + style cues. Each batch counts
            toward a soft daily cap (5 generations per workspace per day) so
            you can iterate without runaway cost.
          </p>
        </div>

        <LogoGenerator workspaceId={ws.id} defaultBrandName={ws.name} />

        {logoItems.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-ink uppercase tracking-wider mb-3">
              Recent generations
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {logoItems.map((l) => (
                <a
                  key={l.id}
                  href={l.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-2xl border border-accent-100 bg-white p-3 hover:shadow-sm transition-shadow"
                >
                  {l.url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={l.url}
                      alt={l.title}
                      className="w-full aspect-square rounded-lg object-contain bg-canvas"
                    />
                  ) : (
                    <div className="w-full aspect-square rounded-lg bg-canvas grid place-items-center text-ink-muted text-xs">
                      No image
                    </div>
                  )}
                  <p className="mt-2 text-[11px] text-ink-muted truncate">
                    {l.title}
                  </p>
                </a>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
