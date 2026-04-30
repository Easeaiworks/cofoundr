/**
 * The canonical Cofoundr Launch Journey.
 *
 * Each step is computed from existing data so we don't need a separate
 * progress table — the source of truth is "do you have an idea?", "do you
 * have a workspace with a jurisdiction?", etc.
 *
 * Add new steps here once their underlying data model exists.
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";

export type JourneyStepStatus = "done" | "current" | "upcoming" | "locked";

export type JourneyStep = {
  id: string;
  title: string;
  hint: string;
  status: JourneyStepStatus;
};

const STAGE_ORDER = ["idea", "forming", "launched", "operating"] as const;
export type WorkspaceStage = (typeof STAGE_ORDER)[number];

export function stageLabel(stage: WorkspaceStage | string | null | undefined): string {
  switch (stage) {
    case "idea":
      return "Idea & validation";
    case "forming":
      return "Forming the company";
    case "launched":
      return "Just launched";
    case "operating":
      return "Operating";
    default:
      return "Idea & validation";
  }
}

export async function loadJourney(workspace_id: string): Promise<{
  steps: JourneyStep[];
  doneCount: number;
  totalCount: number;
  currentStepTitle: string;
}> {
  const supabase = await createClient();

  // Pull the data we need to derive completion. RLS scopes everything.
  const [{ data: ws }, { data: ideas }, { data: docs }, { data: contacts }] =
    await Promise.all([
      supabase
        .from("workspaces")
        .select("id, name, jurisdiction, business_stage")
        .eq("id", workspace_id)
        .maybeSingle(),
      supabase
        .from("business_ideas")
        .select("id")
        .eq("workspace_id", workspace_id)
        .limit(1),
      supabase
        .from("documents")
        .select("id, kind")
        .eq("workspace_id", workspace_id),
      supabase
        .from("contacts")
        .select("id")
        .eq("workspace_id", workspace_id)
        .limit(1),
    ]);

  const hasIdea = (ideas?.length ?? 0) > 0;
  const hasJurisdiction = !!(ws as { jurisdiction?: string } | null)?.jurisdiction;
  const docsCount = docs?.length ?? 0;
  const hasContact = (contacts?.length ?? 0) > 0;

  const raw: Array<{ id: string; title: string; hint: string; done: boolean; locked?: boolean }> = [
    {
      id: "idea",
      title: "Idea discovery",
      hint: "What you're building, who it's for.",
      done: hasIdea,
    },
    {
      id: "jurisdiction",
      title: "Jurisdiction & entity",
      hint: "Where you'll register and what entity type.",
      done: hasJurisdiction,
    },
    {
      id: "name",
      title: "Name & domain",
      hint: "Lock a name + buy the domains.",
      done: hasJurisdiction && hasIdea, // tentative — replace with real signal later
    },
    {
      id: "brand",
      title: "Branding kit",
      hint: "Logo, colors, voice, slogan.",
      done: false,
    },
    {
      id: "legal",
      title: "Legal documents",
      hint: "NDA, contractor, ToS, privacy.",
      done: docsCount >= 1,
    },
    {
      id: "site",
      title: "Website",
      hint: "One-page launch site with checkout.",
      done: false,
    },
    {
      id: "crm",
      title: "First customers",
      hint: "Capture the first 10 leads.",
      done: hasContact,
    },
    {
      id: "operating",
      title: "Run the business",
      hint: "CRM, finance, marketing on autopilot.",
      done: false,
      locked: true,
    },
  ];

  // First not-done becomes "current". Everything after is "upcoming" (or "locked").
  let foundCurrent = false;
  const steps: JourneyStep[] = raw.map((s) => {
    if (s.done) return { ...s, status: "done" as const };
    if (!foundCurrent && !s.locked) {
      foundCurrent = true;
      return { ...s, status: "current" as const };
    }
    return { ...s, status: (s.locked ? "locked" : "upcoming") as const };
  });

  const doneCount = steps.filter((s) => s.status === "done").length;
  const totalCount = steps.length;
  const currentStepTitle =
    steps.find((s) => s.status === "current")?.title ??
    (doneCount === totalCount ? "All done" : "Idea discovery");

  return { steps, doneCount, totalCount, currentStepTitle };
}
