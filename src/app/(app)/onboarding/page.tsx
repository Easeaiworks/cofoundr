import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listMyWorkspaces, MAX_WORKSPACES_PER_USER } from "@/lib/workspace";
import { OnboardingWizard } from "./wizard";

// Auth-gated; no metadata export needed.

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const workspaces = await listMyWorkspaces();
  const params = await searchParams;
  const wantsNew = params.new === "1";

  // First-time user (no workspaces) → wizard.
  // Returning user without ?new=1 → bounce to /home so they can pick a workspace.
  if (workspaces.length > 0 && !wantsNew) redirect("/home");

  // At cap — show a friendly message instead of the wizard.
  if (workspaces.length >= MAX_WORKSPACES_PER_USER) {
    return (
      <main className="min-h-screen bg-canvas grid place-items-center px-4">
        <div className="max-w-md rounded-2xl border border-accent-100 bg-white p-8 text-center">
          <h1 className="text-xl font-semibold text-ink">
            You&rsquo;ve reached {MAX_WORKSPACES_PER_USER} ideas
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Cofoundr keeps you focused — three is the cap. Archive one of your
            existing ideas to start another.
          </p>
          <Link
            href="/home"
            className="mt-6 inline-flex rounded-md bg-accent text-white px-4 py-2 text-sm hover:bg-accent-400"
          >
            Back to your ideas
          </Link>
        </div>
      </main>
    );
  }

  const isFirstTime = workspaces.length === 0;

  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-accent-100 bg-white">
        <div className="container max-w-3xl py-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-accent">
              {isFirstTime ? "Welcome to Cofoundr" : `New idea (${workspaces.length + 1} of ${MAX_WORKSPACES_PER_USER})`}
            </p>
            <h1 className="text-2xl font-semibold text-ink">
              {isFirstTime ? "Let’s set up your workspace" : "Spin up another business"}
            </h1>
          </div>
          {!isFirstTime && (
            <Link
              href="/home"
              className="text-sm text-ink-muted hover:text-ink"
            >
              Cancel
            </Link>
          )}
        </div>
      </header>
      <section className="container max-w-3xl py-10">
        <OnboardingWizard userEmail={data.user.email ?? ""} />
      </section>
    </main>
  );
}
