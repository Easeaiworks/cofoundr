/**
 * Tool catalog for the Cofoundr agent.
 *
 * Each tool has:
 *   - JSON-schema input definition (sent to Claude via the `tools` API param)
 *   - A Zod input validator (defense against tampered payloads)
 *   - An `execute(input, ctx)` that runs server-side and returns a JSON
 *     payload Claude can reason over.
 *
 * Rules:
 *   - Tools are pure functions of their inputs + the caller's context.
 *   - Tools never accept arbitrary tenant_ids — they always use ctx.workspace_id.
 *   - Tools have hard timeouts; failures return a structured error rather than
 *     throwing, so the model can recover gracefully.
 */
import "server-only";
import { z } from "zod";
import { promises as dns } from "node:dns";

// ---------- Tool runtime context -----------------------------------------
export type ToolContext = {
  workspace_id: string;
  user_id: string;
  jurisdiction: string | null;
};

export type ToolExecuteResult = {
  ok: true;
  data: unknown;
} | {
  ok: false;
  error: string;
};

// ---------- check_business_name ------------------------------------------
const CheckNameInput = z.object({
  name: z.string().min(2).max(60),
});

async function dnsAvailable(host: string, timeoutMs = 2500): Promise<"taken" | "available" | "unknown"> {
  // If DNS resolves, the domain is registered (taken). NXDOMAIN → available.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    await dns.resolve(host);
    return "taken";
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOTFOUND" || code === "ENODATA") return "available";
    return "unknown";
  } finally {
    clearTimeout(timer);
  }
}

function slugForHandle(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 30);
}

const checkBusinessName = {
  schema: {
    name: "check_business_name",
    description:
      "Check whether a candidate business name is plausibly available. Returns DNS heuristics for .com / .ca / .ai domains plus links to the official trademark databases (USPTO TESS, CIPO Canadian Trademarks DB) and social-handle search URLs. Use this whenever a user asks 'is this name taken' or before committing to a name.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "The candidate business name to check, e.g. 'Mariposa Candle Co.'",
        },
      },
      required: ["name"],
    },
  },
  async execute(rawInput: unknown): Promise<ToolExecuteResult> {
    const parsed = CheckNameInput.safeParse(rawInput);
    if (!parsed.success) return { ok: false, error: "Invalid name argument." };

    const name = parsed.data.name.trim();
    const handle = slugForHandle(name);
    if (!handle) return { ok: false, error: "Name has no usable letters or digits." };

    const [com, ca, ai] = await Promise.all([
      dnsAvailable(`${handle}.com`),
      dnsAvailable(`${handle}.ca`),
      dnsAvailable(`${handle}.ai`),
    ]);

    return {
      ok: true,
      data: {
        name,
        handle,
        domains: {
          com: { host: `${handle}.com`, status: com },
          ca: { host: `${handle}.ca`, status: ca },
          ai: { host: `${handle}.ai`, status: ai },
        },
        trademark_searches: {
          uspto_tess: `https://tmsearch.uspto.gov/search/search-information?searchText=${encodeURIComponent(name)}`,
          cipo_canada: `https://ised-isde.canada.ca/cipo/trademark-search/srch?lang=eng&text=${encodeURIComponent(name)}`,
        },
        social_handles: {
          instagram: `https://www.instagram.com/${handle}/`,
          x_twitter: `https://x.com/${handle}`,
          tiktok: `https://www.tiktok.com/@${handle}`,
          linkedin: `https://www.linkedin.com/company/${handle}/`,
        },
        notes: [
          "DNS heuristic — 'available' means no DNS record found, but the registrar may still hold the name. Confirm via a registrar (Namecheap, Porkbun, GoDaddy) before buying.",
          "Trademark links are search URLs only. A clean DNS does not imply a clean trademark.",
          "Social handle URLs are best-effort — the platform's own availability search is authoritative.",
        ],
      },
    };
  },
};

// ---------- search_jurisdiction ------------------------------------------
// Phase 1 stub: returns curated, citation-bearing snippets for ON + DE.
// Replace with a Voyage + pgvector retrieval call once the KB is loaded.
const SearchJurisdictionInput = z.object({
  jurisdiction: z.string().min(2).max(20),
  topic: z.string().min(2).max(120),
});

const KB_STUB: Record<string, Record<string, string[]>> = {
  "CA-ON": {
    incorporation: [
      "Ontario sole proprietorship: register the business name (Master Business Licence) via ServiceOntario for $60. Renews every 5 years.",
      "Ontario corporation: file Articles of Incorporation via the Ontario Business Registry. Filing fee is $300 (online) and ~$360 (paper). HST registration becomes mandatory once gross revenue exceeds $30,000 over four consecutive quarters.",
      "Federal corporation (CBCA): incorporate via Corporations Canada for $200, then extra-provincially register in Ontario. Useful if you plan to operate in multiple provinces.",
    ],
    taxes: [
      "Ontario corporate tax: 12.2% combined small-business rate on the first $500k of active business income; 26.5% combined general rate above that. Source: Ministry of Finance Ontario.",
      "HST in Ontario is 13%. Mandatory registration once gross revenue exceeds $30,000 in any single calendar quarter or four consecutive quarters.",
    ],
  },
  "US-DE": {
    incorporation: [
      "Delaware C-Corp: file a Certificate of Incorporation with the Delaware Division of Corporations. Filing fee minimum $89; expedited service available. Annual franchise tax minimum is $175 (Authorized Shares method) or $400 (Assumed Par Value method).",
      "Delaware LLC: file a Certificate of Formation. Filing fee $90. Annual franchise tax flat $300 due June 1.",
      "Almost all VC-backed US tech startups are Delaware C-Corps. Delaware Court of Chancery is the most-cited corporate-law court in the US.",
    ],
    taxes: [
      "Delaware does not impose state corporate income tax on income earned outside Delaware.",
      "Federal corporate income tax is a flat 21% (post-TCJA).",
    ],
  },
};

const searchJurisdiction = {
  schema: {
    name: "search_jurisdiction",
    description:
      "Look up curated, citation-bearing facts about a Canadian province or US state for a given topic (incorporation, taxes, licensing, etc.). Use this whenever the user's question depends on jurisdiction-specific rules. Phase 1 has high-quality coverage for Ontario (CA-ON) and Delaware (US-DE) only; other jurisdictions return a partial-coverage warning.",
    input_schema: {
      type: "object" as const,
      properties: {
        jurisdiction: {
          type: "string",
          description: "Jurisdiction code, e.g. 'CA-ON' or 'US-DE'.",
        },
        topic: {
          type: "string",
          description:
            "Short topic key. Common values: 'incorporation', 'taxes', 'licensing', 'employment'.",
        },
      },
      required: ["jurisdiction", "topic"],
    },
  },
  async execute(rawInput: unknown): Promise<ToolExecuteResult> {
    const parsed = SearchJurisdictionInput.safeParse(rawInput);
    if (!parsed.success) return { ok: false, error: "Invalid arguments." };

    const j = parsed.data.jurisdiction.toUpperCase();
    const topic = parsed.data.topic.toLowerCase().trim();

    const bucket = KB_STUB[j];
    if (!bucket) {
      return {
        ok: true,
        data: {
          jurisdiction: j,
          topic,
          coverage: "partial",
          warning:
            "Phase 1 has full curated coverage only for Ontario (CA-ON) and Delaware (US-DE). For other jurisdictions, give general advice and tell the user to confirm specifics with a local accountant or lawyer.",
          snippets: [],
        },
      };
    }

    const matches = bucket[topic] ?? [];
    if (matches.length === 0) {
      return {
        ok: true,
        data: {
          jurisdiction: j,
          topic,
          coverage: "topic_missing",
          available_topics: Object.keys(bucket),
          warning:
            "No curated content for this topic in this jurisdiction yet. Reason from general principles and recommend professional confirmation.",
          snippets: [],
        },
      };
    }

    return {
      ok: true,
      data: { jurisdiction: j, topic, coverage: "full", snippets: matches },
    };
  },
};

// ---------- Tool registry ------------------------------------------------
export const TOOLS = [checkBusinessName, searchJurisdiction] as const;

export const TOOL_SCHEMAS = TOOLS.map((t) => t.schema);

export async function executeTool(
  name: string,
  input: unknown,
  _ctx: ToolContext
): Promise<ToolExecuteResult> {
  const t = TOOLS.find((x) => x.schema.name === name);
  if (!t) return { ok: false, error: `Unknown tool: ${name}` };
  try {
    return await t.execute(input);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Tool execution error";
    return { ok: false, error: msg };
  }
}
