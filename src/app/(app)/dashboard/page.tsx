import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listMyWorkspaces } from "@/lib/workspace";
import { CofoundrChat } from "@/components/cofoundr-chat";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/login");

  // First-login flow: no workspace yet → onboarding.
  const workspaces = await listMyWorkspaces();
  if (workspaces.length === 0) redirect("/onboarding");

  // For now we use the first workspace. Workspace switcher lands later.
  const ws = workspaces[0]!;

  // Pull the most recent business idea (if any) so we can seed Cofoundr's context.
  const { data: ideaRow } = await supabase
    .from("business_ideas")
    .select("title, summary, metadata")
    .eq("workspace_id", ws.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-accent-100 bg-white">
        <div className="container max-w-5xl py-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-accent">Cofoundr</p>
            <h1 className="text-xl font-semibold text-ink">{ws.name}</h1>
            <p className="text-xs text-ink-muted">
              {ws.jurisdiction ?? "Jurisdiction not set"} · stage: {ws.business_stage ?? "idea"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-muted">{user.email}</p>
            <form action="/auth/signout" method="post">
              <button type="submit" className="mt-1 text-xs text-accent hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="container max-w-5xl py-8">
        <CofoundrChat
          workspaceId={ws.id}
          jurisdiction={ws.jurisdiction ?? null}
          ideaContext={
            ideaRow
              ? {
                  title: (ideaRow as { title: string }).title,
                  metadata: (ideaRow as { metadata: Record<string, unknown> }).metadata,
                }
              : null
          }
        />
      </section>
    </main>
  );
}
