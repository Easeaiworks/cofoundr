/**
 * Voyage AI embeddings — used by the kb_cache semantic cache.
 *
 * Voyage's `voyage-3-large` produces 1024-dim embeddings; matches the
 * `vector(1024)` column in `public.kb_cache`. Their REST API is simple
 * enough that we don't pull in their SDK.
 *
 * Pricing: ~$0.12 per million tokens. A typical Cofoundr query is 50-150
 * tokens, so each cache lookup costs ~$0.00002 — three orders of magnitude
 * cheaper than the Sonnet call it might save.
 */
import "server-only";
import { getServerEnv } from "@/lib/env";

export type EmbedInputType = "query" | "document";

export async function embed(text: string, type: EmbedInputType): Promise<number[]> {
  const env = getServerEnv();
  if (!env.VOYAGE_API_KEY) {
    throw new Error("VOYAGE_API_KEY is not set. Cache lookups disabled.");
  }

  const trimmed = text.slice(0, 4_000); // Voyage caps tokens; 4k chars is plenty.

  const resp = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input: trimmed,
      model: env.VOYAGE_MODEL,
      input_type: type,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Voyage ${resp.status}: ${body.slice(0, 200)}`);
  }

  const data = (await resp.json()) as {
    data: { embedding: number[] }[];
  };
  const vec = data.data?.[0]?.embedding;
  if (!vec || vec.length === 0) {
    throw new Error("Voyage returned no embedding");
  }
  return vec;
}
