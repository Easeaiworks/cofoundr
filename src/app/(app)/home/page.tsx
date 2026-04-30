import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, ArrowRight, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  listMyWorkspaces,
  MAX_WORKSPACES_PER_USER,
  type WorkspaceSummary,
} from "@/lib/workspace";
import { stageLabel } from "@/lib/journey";
import { setActiveWorkspaceAction } from "./actions";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/login");

  const workspaces = await listMyWorkspaces();
  const canAddMore = workspaces.length < MAX_WORKSPACES_PER_USER;

  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-accent-100 bg-white">
        <div className="container max-w-5xl py-4 flex items-center justify-between">
          <Link href="/home" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white text-sm font-bold">
              c
            </span>
            <span className="font-semibold tracking-tight text-ink">Cofoundr</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-ink-muted">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md border border-accent-100 px-3 py-1.5 text-xs text-ink hover:bg-accent-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="container max-w-5xl py-10">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wider text-accent">Your account</p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">Your ideas</h1>
          <p className="mt-1 text-ink-muted">
            You can keep up to {MAX_WORKSPACES_PER_USER} business ideas going at once. Each one
            has its own dashboard, AI co-founder, and Launch Journey.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws) => (
            <WorkspaceCard key={ws.id} ws={ws} />
          ))}

          {canAddMore && <NewIdeaCard remaining={MAX_WORKSPACES_PER_USER - workspaces.length} />}
          {!canAddMore && (
            <div className="rounded-2xl border border-dashed border-accent-100 bg-white p-5 text-sm text-ink-muted">
              You&rsquo;ve reached {MAX_WORKSPACES_PER_USER} ideas. Archive one to start another.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function WorkspaceCard({ ws }: { ws: WorkspaceSummary }) {
  return (
    <form action={setActiveWorkspaceAction} className="contents">
      <input type="hidden" name="slug" value={ws.slug} />
      <button
        type="submit"
        className="text-left rounded-2xl border border-accent-100 bg-white p-5 hover:shadow-sm hover:border-accent-400 transition-all group"
      >
        <p className="text-[11px] uppercase tracking-wider text-accent">{stageLabel(ws.business_stage)}</p>
        <h3 className="mt-1 text-lg font-semibold text-ink truncate">{ws.name}</h3>
        <p className="text-xs text-ink-muted mt-1">
          {ws.jurisdiction ?? "Jurisdiction not set"}
        </p>
        <div className="mt-4 flex items-center text-xs text-accent group-hover:translate-x-0.5 transition-transform">
          Open dashboard <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </div>
      </button>
    </form>
  );
}

function NewIdeaCard({ remaining }: { remaining: number }) {
  return (
    <Link
      href="/onboarding?new=1"
      className="group rounded-2xl border border-dashed border-accent bg-accent-50 p-5 hover:bg-accent-100 transition-colors flex flex-col"
    >
      <div className="flex items-center gap-2 text-accent">
        <Plus className="h-4 w-4" />
        <p className="text-sm font-semibold">New idea</p>
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        Spin up a new business workspace. Cofoundr starts fresh — different idea,
        different jurisdiction if you want.
      </p>
      <p className="mt-auto pt-4 text-[11px] text-ink-muted">
        {remaining} {remaining === 1 ? "slot" : "slots"} left
      </p>
    </Link>
  );
}
