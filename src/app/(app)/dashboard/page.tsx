import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listMyWorkspaces, MAX_WORKSPACES_PER_USER } from "@/lib/workspace";
import { loadJourney, stageLabel } from "@/lib/journey";
import { readActiveWorkspaceCookie } from "@/lib/active-workspace";
import { CofoundrChat } from "@/components/cofoundr-chat";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { JourneySidebar } from "@/components/journey-sidebar";

// Auth-gated; no metadata export needed.

const JURISDICTION_LABELS: Record<string, string> = {
  "CA-ON": "Ontario, Canada",
  "CA-BC": "British Columbia, Canada",
  "CA-AB": "Alberta, Canada",
  "CA-QC": "Quebec, Canada",
  "CA-OTHER": "Canada",
  "US-DE": "Delaware, USA",
  "US-CA": "California, USA",
  "US-TX": "Texas, USA",
  "US-FL": "Florida, USA",
  "US-NY": "New York, USA",
  "US-OTHER": "USA",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/login");

  // First-login flow: no workspace yet → onboarding.
  const workspaces = await listMyWorkspaces();
  if (workspaces.length === 0) redirect("/onboarding");

  // Resolve which workspace to show: ?w=slug → cookie → first workspace.
  const params = await searchParams;
  const wantSlug =
    params.w ?? (await readActiveWorkspaceCookie()) ?? workspaces[0]!.slug;

  const ws = workspaces.find((w) => w.slug === wantSlug) ?? workspaces[0]!;

  // NOTE: We deliberately do NOT write the cookie here — Next.js 15 forbids
  // writing cookies during a Server Component render. The cookie is set in
  // server actions (workspace switcher, onboarding completion) instead.
  // ?w=slug overrides per-request without persisting; that's intentional.

  // Pull the most recent business idea (if any) so we can seed Cofoundr's context.
  const { data: ideaRow } = await supabase
    .from("business_ideas")
    .select("title, summary, metadata")
    .eq("workspace_id", ws.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Pull the chat history so a refresh restores the conversation.
  const { data: history } = await supabase
    .from("ai_messages")
    .select("role, content, created_at")
    .eq("workspace_id", ws.id)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true })
    .limit(80);

  const initialMessages =
    (history as { role: "user" | "assistant"; content: string }[] | null)?.map(
      (h) => ({ role: h.role, content: h.content })
    ) ?? [];

  // Compute Launch Journey progress.
  const journey = await loadJourney(ws.id);

  const jurisdictionLabel =
    (ws.jurisdiction && JURISDICTION_LABELS[ws.jurisdiction]) ||
    ws.jurisdiction ||
    null;

  return (
    <main className="min-h-screen bg-canvas">
      <DashboardTopbar
        workspaceName={ws.name}
        workspaceSlug={ws.slug}
        jurisdictionLabel={jurisdictionLabel}
        stageLabel={stageLabel(ws.business_stage)}
        currentStepTitle={journey.currentStepTitle}
        doneCount={journey.doneCount}
        totalCount={journey.totalCount}
        userEmail={user.email ?? ""}
        allWorkspaces={workspaces.map((w) => ({
          id: w.id,
          name: w.name,
          slug: w.slug,
        }))}
        canAddMore={workspaces.length < MAX_WORKSPACES_PER_USER}
      />

      <section className="container max-w-6xl py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Chat (main) */}
          <div className="min-w-0">
            <CofoundrChat
              workspaceId={ws.id}
              jurisdiction={ws.jurisdiction ?? null}
              ideaContext={
                ideaRow
                  ? {
                      title: (ideaRow as { title: string }).title,
                      metadata: (ideaRow as { metadata: Record<string, unknown> })
                        .metadata,
                    }
                  : null
              }
              initialMessages={initialMessages}
            />
          </div>

          {/* Journey rail */}
          <JourneySidebar
            steps={journey.steps}
            doneCount={journey.doneCount}
            totalCount={journey.totalCount}
          />
        </div>
      </section>
    </main>
  );
}
