/**
 * Workspace helpers — server-only.
 *
 * Reads use the user-scoped client (RLS-respecting).
 * Writes use the admin client because:
 *   - workspace creation needs to insert into both `workspaces` and
 *     `workspace_members` atomically; the second insert needs the user to
 *     already be a workspace member, which is a chicken-and-egg under RLS.
 *
 * Every admin write is wrapped with an explicit ownership check + audit log.
 */
import "server-only";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  jurisdiction: string | null;
  business_stage: string | null;
  role: string;
};

/** Workspaces the current user is a member of. */
export async function listMyWorkspaces(): Promise<WorkspaceSummary[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("workspace_members")
    .select(
      "role, workspace:workspaces(id,name,slug,jurisdiction,business_stage)"
    )
    .eq("user_id", user.id);

  if (error || !data) return [];

  type Row = {
    role: string;
    workspace: {
      id: string;
      name: string;
      slug: string;
      jurisdiction: string | null;
      business_stage: string | null;
    } | null;
  };

  return (data as unknown as Row[])
    .filter((r) => r.workspace)
    .map((r) => ({
      id: r.workspace!.id,
      name: r.workspace!.name,
      slug: r.workspace!.slug,
      jurisdiction: r.workspace!.jurisdiction,
      business_stage: r.workspace!.business_stage,
      role: r.role,
    }));
}

/** Slug guard — kebab-case, ASCII, 3–40 chars. */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export type CreateWorkspaceInput = {
  name: string;
  slug?: string;
  jurisdiction?: string;
  business_stage?: string;
};

export type CreateWorkspaceResult =
  | { ok: true; workspace_id: string; slug: string }
  | { ok: false; error: string };

/**
 * Create a workspace + add caller as owner. Atomic-ish: we create the
 * workspace, then immediately add the membership row. If the second insert
 * fails, we delete the workspace to keep the schema clean.
 */
export async function createWorkspace(
  input: CreateWorkspaceInput
): Promise<CreateWorkspaceResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Workspace name is required" };
  if (name.length > 80) return { ok: false, error: "Name is too long" };

  const slug = normalizeSlug(input.slug ?? name);
  if (slug.length < 3) return { ok: false, error: "Slug must be at least 3 characters" };

  const admin = createAdminClient();

  // 1. Create the workspace.
  const { data: ws, error: wsErr } = await admin
    .from("workspaces")
    .insert({
      name,
      slug,
      jurisdiction: input.jurisdiction ?? null,
      business_stage: input.business_stage ?? "idea",
      owner_id: user.id,
    })
    .select("id, slug")
    .single();

  if (wsErr || !ws) {
    if (wsErr?.code === "23505") {
      return { ok: false, error: "That URL slug is already taken — try another." };
    }
    return { ok: false, error: wsErr?.message ?? "Could not create workspace" };
  }

  // 2. Add caller as owner.
  const { error: memberErr } = await admin
    .from("workspace_members")
    .insert({ workspace_id: ws.id, user_id: user.id, role: "owner" });

  if (memberErr) {
    await admin.from("workspaces").delete().eq("id", ws.id);
    return { ok: false, error: memberErr.message };
  }

  // 3. Audit log.
  await admin.from("audit_log").insert({
    workspace_id: ws.id,
    actor_id: user.id,
    action: "workspace.create",
    target_type: "workspace",
    target_id: ws.id,
    payload: { name, slug, jurisdiction: input.jurisdiction ?? null },
  });

  return { ok: true, workspace_id: ws.id, slug: ws.slug };
}

/** Save the output of the 6-question idea-discovery wizard. */
export type IdeaDiscoveryAnswers = {
  interests: string;
  budget: string;
  time_per_week: string;
  online_or_local: "online" | "local" | "both";
  product_or_service: "product" | "service" | "both";
  ambition: "side_income" | "full_time" | "scale";
};

export async function saveBusinessIdea(
  workspace_id: string,
  answers: IdeaDiscoveryAnswers,
  title?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" } as const;

  // RLS will block if the user isn't a member of this workspace.
  const { data, error } = await supabase
    .from("business_ideas")
    .insert({
      workspace_id,
      title: title ?? "Initial idea",
      summary: null,
      metadata: { ...answers, source: "onboarding-wizard-v1" },
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed" } as const;
  return { ok: true, id: (data as { id: string }).id } as const;
}
