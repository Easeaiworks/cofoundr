import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listMyWorkspaces } from "@/lib/workspace";
import { OnboardingWizard } from "./wizard";

// Auth-gated; no metadata export needed.

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  // If the user already has a workspace, they don't need this flow.
  const workspaces = await listMyWorkspaces();
  if (workspaces.length > 0) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-accent-100 bg-white">
        <div className="container max-w-3xl py-5">
          <p className="text-xs uppercase tracking-wider text-accent">Welcome to Cofoundr</p>
          <h1 className="text-2xl font-semibold text-ink">Let&rsquo;s set up your workspace</h1>
        </div>
      </header>
      <section className="container max-w-3xl py-10">
        <OnboardingWizard userEmail={data.user.email ?? ""} />
      </section>
    </main>
  );
}
