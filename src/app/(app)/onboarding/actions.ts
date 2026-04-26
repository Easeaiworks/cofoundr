"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createWorkspace,
  saveBusinessIdea,
  type IdeaDiscoveryAnswers,
} from "@/lib/workspace";

const Step1Schema = z.object({
  name: z.string().min(2).max(80),
  jurisdiction: z.string().min(2).max(20),
});

const Step2Schema = z.object({
  workspace_id: z.string().uuid(),
  interests: z.string().min(2).max(500),
  budget: z.string().min(1).max(50),
  time_per_week: z.string().min(1).max(50),
  online_or_local: z.enum(["online", "local", "both"]),
  product_or_service: z.enum(["product", "service", "both"]),
  ambition: z.enum(["side_income", "full_time", "scale"]),
});

export type ActionResult =
  | { ok: true; redirect?: string; workspace_id?: string }
  | { ok: false; error: string };

/** Step 1 of onboarding: create the workspace. */
export async function createWorkspaceAction(formData: FormData): Promise<ActionResult> {
  const parsed = Step1Schema.safeParse({
    name: formData.get("name"),
    jurisdiction: formData.get("jurisdiction"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please enter a name and select a jurisdiction." };
  }

  const result = await createWorkspace({
    name: parsed.data.name,
    jurisdiction: parsed.data.jurisdiction,
  });

  if (!result.ok) return result;
  return { ok: true, workspace_id: result.workspace_id };
}

/** Step 2 of onboarding: save the idea-discovery answers, then continue. */
export async function saveIdeaAction(formData: FormData): Promise<ActionResult> {
  const parsed = Step2Schema.safeParse({
    workspace_id: formData.get("workspace_id"),
    interests: formData.get("interests"),
    budget: formData.get("budget"),
    time_per_week: formData.get("time_per_week"),
    online_or_local: formData.get("online_or_local"),
    product_or_service: formData.get("product_or_service"),
    ambition: formData.get("ambition"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please answer all six questions." };
  }

  const { workspace_id, ...answers } = parsed.data;
  const result = await saveBusinessIdea(
    workspace_id,
    answers as IdeaDiscoveryAnswers
  );

  if (!result.ok) return result;
  redirect("/dashboard");
}
