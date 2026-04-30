"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Delete a document. RLS handles tenant scoping; we double-check the
 * document belongs to a workspace the user is a member of before deleting.
 * Storage-backed assets get their object removed too.
 */
export async function deleteDocumentAction(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: doc } = await supabase
    .from("documents")
    .select("id, storage_path")
    .eq("id", id.data)
    .maybeSingle();
  if (!doc) return;

  const d = doc as { id: string; storage_path: string | null };

  // Delete via RLS-scoped client (will fail if user isn't a member).
  const { error: delErr } = await supabase
    .from("documents")
    .delete()
    .eq("id", d.id);

  if (delErr) return;

  // If the doc had a storage object, clean it up via admin client (Storage API
  // doesn't honor RLS the same way; we already verified ownership above).
  if (d.storage_path) {
    const admin = createAdminClient();
    await admin.storage.from("documents").remove([d.storage_path]).catch(() => null);
  }

  revalidatePath("/documents");
}
