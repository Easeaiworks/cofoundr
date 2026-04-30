/**
 * Replicate API client. Used by the logo generator (Flux Schnell by default).
 *
 * Replicate's "predictions" API is async by default but they expose a
 * synchronous-feeling endpoint via the `Prefer: wait=N` header. For Flux
 * Schnell, predictions complete in ~3 seconds, so we wait inline.
 *
 * Pricing: ~$0.003 per image with Flux Schnell. A 4-variant logo gen is
 * ~$0.012 — trivial.
 */
import "server-only";
import { getServerEnv } from "@/lib/env";

export type FluxLogoInput = {
  prompt: string;
  num_outputs?: number;        // default 4
  aspect_ratio?: string;       // default "1:1"
  output_format?: "png" | "jpg" | "webp";
  go_fast?: boolean;
  megapixels?: "0.25" | "1";   // 0.25 is plenty for a logo concept
  num_inference_steps?: number;
};

export type ReplicatePrediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: string | string[] | null;
  error: string | null;
  urls: { get: string; cancel: string };
};

const BASE = "https://api.replicate.com/v1";

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * Run a Flux Schnell prediction synchronously (waits up to 60s).
 * Returns the array of output image URLs Replicate hosts.
 */
export async function generateLogos(input: FluxLogoInput): Promise<string[]> {
  const env = getServerEnv();
  if (!env.REPLICATE_API_TOKEN) {
    throw new Error(
      "REPLICATE_API_TOKEN is not set. Add it in Vercel env vars and redeploy."
    );
  }

  // Flux Schnell on Replicate is published as a model, not a versioned URL.
  const modelEndpoint = `${BASE}/models/${env.REPLICATE_LOGO_MODEL}/predictions`;

  const body = {
    input: {
      prompt: input.prompt,
      num_outputs: input.num_outputs ?? 4,
      aspect_ratio: input.aspect_ratio ?? "1:1",
      output_format: input.output_format ?? "png",
      go_fast: input.go_fast ?? true,
      megapixels: input.megapixels ?? "0.25",
      num_inference_steps: input.num_inference_steps ?? 4,
    },
  };

  const resp = await fetch(modelEndpoint, {
    method: "POST",
    headers: {
      ...authHeaders(env.REPLICATE_API_TOKEN),
      // Wait inline up to 60s for the prediction to complete.
      Prefer: "wait=60",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Replicate ${resp.status}: ${text.slice(0, 300)}`);
  }

  const pred = (await resp.json()) as ReplicatePrediction;

  if (pred.status === "succeeded") {
    const out = pred.output;
    if (Array.isArray(out)) return out;
    if (typeof out === "string") return [out];
    throw new Error("Replicate returned no output URLs");
  }
  if (pred.status === "failed" || pred.status === "canceled") {
    throw new Error(`Replicate prediction ${pred.status}: ${pred.error ?? "unknown"}`);
  }

  // Still processing — poll briefly.
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const r2 = await fetch(pred.urls.get, {
      headers: authHeaders(env.REPLICATE_API_TOKEN),
    });
    const p2 = (await r2.json()) as ReplicatePrediction;
    if (p2.status === "succeeded") {
      const out = p2.output;
      if (Array.isArray(out)) return out;
      if (typeof out === "string") return [out];
    }
    if (p2.status === "failed" || p2.status === "canceled") {
      throw new Error(`Replicate prediction ${p2.status}: ${p2.error ?? "unknown"}`);
    }
  }
  throw new Error("Replicate prediction timed out");
}

/**
 * Build a logo prompt from user-provided brand inputs. Keeps the prompt
 * tight so Flux produces logo-style imagery (mark + wordmark) rather than
 * full marketing scenes.
 */
export function buildLogoPrompt(opts: {
  brandName: string;
  industry?: string;
  vibe?: string;        // e.g. "modern, sustainable, premium"
  colorHint?: string;   // e.g. "deep teal and warm cream"
  style?: string;       // e.g. "geometric minimal", "hand-drawn", "serif wordmark"
}): string {
  const parts = [
    `Logo design for "${opts.brandName}".`,
    opts.industry ? `Industry: ${opts.industry}.` : "",
    opts.vibe ? `Vibe: ${opts.vibe}.` : "",
    opts.colorHint ? `Color palette: ${opts.colorHint}.` : "",
    opts.style ? `Style: ${opts.style}.` : "",
    "Clean, professional, vector-style mark on solid white background, centered, balanced negative space, no text spelling errors, no watermarks, no photographic elements.",
  ];
  return parts.filter(Boolean).join(" ");
}
