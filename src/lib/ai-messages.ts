/**
 * Chat history persistence. Service-role only (RLS blocks direct writes by design).
 *
 * Every meaningful event in a Cofoundr conversation gets a row:
 *   - role 'user' / 'assistant' / 'tool' — the turn type
 *   - content — text or stringified tool args/result
 *   - model + tokens_in/out + cost_cents — for spend tracking
 *   - metadata — anything else worth keeping (tool name, prompt version, etc.)
 *
 * We also write an audit_log row mirroring the event so SOC 2 evidence is
 * collected from day one.
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { COFOUNDR_PROMPT_VERSION } from "@/lib/anthropic";

export type AiMessageInsert = {
  workspace_id: string;
  user_id: string | null;
  role: "user" | "assistant" | "tool";
  content: string;
  model?: string;
  tokens_in?: number;
  tokens_out?: number;
  cost_cents?: number;
  metadata?: Record<string, unknown>;
};

export async function saveAiMessage(row: AiMessageInsert) {
  const admin = createAdminClient();

  const insertedAt = new Date().toISOString();
  const metadata = {
    prompt_version: COFOUNDR_PROMPT_VERSION,
    ...row.metadata,
  };

  const { error: msgErr } = await admin.from("ai_messages").insert({
    workspace_id: row.workspace_id,
    user_id: row.user_id,
    role: row.role,
    content: row.content,
    model: row.model ?? null,
    tokens_in: row.tokens_in ?? null,
    tokens_out: row.tokens_out ?? null,
    cost_cents: row.cost_cents ?? null,
    metadata,
  });

  if (msgErr) {
    // Don't throw — chat must keep working even if logging fails.
    // We still try to push to the audit log.
    console.warn("[ai_messages] insert failed:", msgErr.message);
  }

  await admin.from("audit_log").insert({
    workspace_id: row.workspace_id,
    actor_id: row.user_id,
    action: `chat.${row.role}`,
    target_type: "ai_message",
    payload: {
      model: row.model,
      tokens_in: row.tokens_in,
      tokens_out: row.tokens_out,
      cost_cents: row.cost_cents,
      content_chars: row.content.length,
      ts: insertedAt,
    },
  });
}

/**
 * Recent N turns for a workspace, oldest first. Used to seed Claude's context
 * on subsequent turns. Trims to a soft token budget by chopping the oldest
 * messages first when the total content exceeds `maxChars`.
 */
export async function recentTurns(workspace_id: string, maxChars = 16_000) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_messages")
    .select("role, content, created_at")
    .eq("workspace_id", workspace_id)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: false })
    .limit(40);

  if (!data) return [] as { role: "user" | "assistant"; content: string }[];

  type Row = { role: "user" | "assistant"; content: string };
  const rows = (data as unknown as Row[]).reverse();

  let total = 0;
  const out: Row[] = [];
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i]!;
    const len = r.content.length;
    if (total + len > maxChars) break;
    total += len;
    out.unshift(r);
  }
  return out;
}
