"use server";

import { redirect } from "next/navigation";
import { writeActiveWorkspaceCookie } from "@/lib/active-workspace";
import { listMyWorkspaces } from "@/lib/workspace";

/**
 * Set the user's active workspace cookie and bounce them to /dashboard.
 * Validates that the user is actually a member of the workspace before
 * setting the cookie, so a tampered form can't switch them into a workspace
 * they don't own.
 */
export async function setActiveWorkspaceAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) redirect("/home");

  const mine = await listMyWorkspaces();
  const owned = mine.find((w) => w.slug === slug);
  if (!owned) redirect("/home");

  await writeActiveWorkspaceCookie(slug);
  redirect("/dashboard");
}
