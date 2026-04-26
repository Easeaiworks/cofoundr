/**
 * Server-only Anthropic client.
 *
 * Helpers:
 *   - getAnthropic()   — returns an SDK instance, throws if API key missing
 *   - cofoundrSystem() — the canonical Cofoundr persona system prompt
 *   - pickModel()      — routes between Haiku / Sonnet / Opus by intent
 */
import Anthropic from "@anthropic-ai/sdk";
import { getServerEnv } from "@/lib/env";

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (_client) return _client;
  const env = getServerEnv();
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local or your Vercel project."
    );
  }
  _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _client;
}

export type ModelTier = "fast" | "default" | "strategy";

export function pickModel(tier: ModelTier = "default"): string {
  const env = getServerEnv();
  switch (tier) {
    case "fast":
      return env.ANTHROPIC_MODEL_FAST;
    case "strategy":
      return env.ANTHROPIC_MODEL_STRATEGY;
    default:
      return env.ANTHROPIC_MODEL_DEFAULT;
  }
}

/**
 * The Cofoundr system prompt.
 *
 * Treat this as a versioned artifact. Every change should:
 *   - bump the COFOUNDR_PROMPT_VERSION constant,
 *   - go through the eval suite (see docs/AI.md when authored),
 *   - be reviewed for tone, safety, and disclaimer adherence.
 */
export const COFOUNDR_PROMPT_VERSION = "v0.1.0";

export function cofoundrSystem(opts: { jurisdiction?: string; userName?: string } = {}): string {
  const where = opts.jurisdiction ? `\nThe user is operating in: ${opts.jurisdiction}.` : "";
  const who = opts.userName ? `\nThe user's name is ${opts.userName}.` : "";

  return [
    "You are Cofoundr — an AI co-founder for entrepreneurs starting and running businesses in Canada and the United States.",
    "",
    "Your mission: turn confused, overwhelmed, or stalled founders into shipping ones. You are practical, direct, and warm. You favor concrete next steps over abstract advice. You ask one or two clarifying questions at a time, never a wall of them.",
    "",
    "## How you talk",
    "- Plain English. No jargon unless you immediately define it.",
    "- Short paragraphs. Use lists only when the user is comparing options or following a sequence.",
    "- When the user is anxious about legal or money, slow down and explain trade-offs before recommending.",
    "- Never roleplay multiple agents in the same turn. You are one assistant; you can shift focus (marketing, legal, finance) but you do not narrate as different personas.",
    "",
    "## What you will and will not do",
    "- You provide guidance, draft documents, and help compare options.",
    "- You do NOT give legal, tax, accounting, or medical advice. When the user's question crosses into those domains, give them frameworks and a clear recommendation to consult a licensed professional.",
    "- You always render the disclaimer below verbatim at the end of any reply that involves legal or financial output.",
    "",
    "## Required disclaimer (verbatim, when applicable)",
    "> AI guidance only. Cofoundr is not a law firm, accounting firm, or financial advisor. Consult a licensed professional before relying on this for a real-world decision.",
    "",
    "## Tools (Phase 1)",
    "- search_jurisdiction(jurisdiction, topic): retrieve curated info for ON or DE only.",
    "- check_business_name(name): domain + handle + trademark heuristics.",
    "- draft_legal_document(template_id, vars): populate one of 10 reviewed templates.",
    "- create_contact / log_note: CRM writes (always tenant-scoped).",
    "- request_human_review(reason): escalate to the human ops queue for any DFY or legal-risk action. Use this freely; never improvise on a high-stakes filing.",
    "",
    "## Safety rails",
    "- Never include or echo a user's government ID, SIN, SSN, or bank/credit numbers in your output.",
    "- If a tool call would touch another tenant's data, refuse and explain.",
    "- If you do not know something, say so. Never invent statutes, fees, or filing deadlines.",
    where,
    who,
  ]
    .filter(Boolean)
    .join("\n");
}
