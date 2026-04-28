/**
 * Cross-tenant semantic cache for Cofoundr's "general info" answers.
 *
 * Why cross-tenant: a Toronto founder asking "What is HST in Ontario?" and a
 * Calgary founder asking the same question have the same correct answer. We
 * generate it once and recycle it — that's the whole point of the cache.
 *
 * What we DON'T cache: anything that's user-specific, opinion, or strategic
 * advice. The classifier flags whether the question is cacheable; only those
 * are stored.
 *
 * Lookup is a Voyage embedding ($0.00002) + an HNSW index search in pgvector
 * (sub-millisecond). On a hit, we return the cached answer with zero LLM
 * cost — vs ~$0.05 for a Sonnet generation.
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { embed } from "@/lib/voyage";

export type CacheTopic =
  | "tax"
  | "incorporation"
  | "funding"
  | "naming"
  | "compliance"
  | "general";

export type CacheHit = {
  id: string;
  answer: string;
  question: string;
  similarity: number;
  hit_count: number;
};

/**
 * TTL by topic, in days. Tax + incorporation rules change slowly; funding
 * markets change fast; null = no expiry (factual evergreen).
 */
function ttlDaysForTopic(topic: CacheTopic | null): number | null {
  switch (topic) {
    case "tax":
    case "incorporation":
      return 90;
    case "compliance":
      return 60;
    case "funding":
      return 14;
    case "naming":
      return 30;
    case "general":
    default:
      return 30;
  }
}

/**
 * Look up a cached answer for this question + jurisdiction. Returns null if
 * no match above threshold. Increments hit_count on success (fire-and-forget).
 *
 * Threshold tuning:
 *   - 0.95 = essentially identical wording. Almost no false positives, low recall.
 *   - 0.92 = strong paraphrase. Good default for v1.
 *   - 0.88 = loose match. Risk of returning the wrong answer.
 */
export async function lookupCache(opts: {
  question: string;
  jurisdiction: string | null;
  threshold?: number;
}): Promise<CacheHit | null> {
  try {
    const embedding = await embed(opts.question, "query");
    const admin = createAdminClient();
    const threshold = opts.threshold ?? 0.92;

    const { data, error } = await admin.rpc("match_kb_cache", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_jurisdiction: opts.jurisdiction,
      match_count: 1,
    });

    if (error) {
      console.warn("[kb_cache] match_kb_cache rpc error:", error.message);
      return null;
    }

    const rows = (data ?? []) as Array<{
      id: string;
      question_text: string;
      answer_text: string;
      hit_count: number;
      similarity: number;
    }>;
    if (rows.length === 0) return null;
    const row = rows[0]!;

    // Increment hit counter, async — don't block the response.
    void admin
      .from("kb_cache")
      .update({
        hit_count: row.hit_count + 1,
        last_hit_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    return {
      id: row.id,
      answer: row.answer_text,
      question: row.question_text,
      similarity: row.similarity,
      hit_count: row.hit_count + 1,
    };
  } catch (e) {
    console.warn(
      "[kb_cache] lookup failed:",
      e instanceof Error ? e.message : String(e)
    );
    return null;
  }
}

/**
 * Save a new answer to the cache. Best-effort; failures don't break the
 * conversation. Embedding is generated as `document` (Voyage's mode for
 * indexed content), distinct from `query` so retrieval can be asymmetric.
 */
export async function saveCache(opts: {
  question: string;
  jurisdiction: string | null;
  topic: CacheTopic;
  answer: string;
  model_used: string;
  tokens_in: number;
  tokens_out: number;
  cost_cents: number;
}): Promise<void> {
  try {
    if (!opts.answer || opts.answer.length < 40) return; // junk responses, skip
    if (opts.answer.length > 8_000) return; // suspiciously long, skip

    const embedding = await embed(opts.question, "document");
    const admin = createAdminClient();
    const ttlDays = ttlDaysForTopic(opts.topic);
    const ttl_at = ttlDays
      ? new Date(Date.now() + ttlDays * 86_400_000).toISOString()
      : null;

    await admin.from("kb_cache").insert({
      jurisdiction: opts.jurisdiction,
      topic_tag: opts.topic,
      question_text: opts.question.slice(0, 1_000),
      question_embedding: embedding,
      answer_text: opts.answer,
      model_used: opts.model_used,
      tokens_in: opts.tokens_in,
      tokens_out: opts.tokens_out,
      cost_cents: opts.cost_cents,
      ttl_at,
    });
  } catch (e) {
    console.warn(
      "[kb_cache] save failed:",
      e instanceof Error ? e.message : String(e)
    );
  }
}
