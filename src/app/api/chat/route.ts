/**
 * /api/chat — Cofoundr agentic chat endpoint.
 *
 * Why non-streaming for now:
 *   Tool use is the killer feature, and handling tool_use mid-stream is
 *   significantly more complex than running an agentic loop and returning
 *   the final assembled answer. We trade a few seconds of latency for a
 *   working tool-use loop now; we'll re-introduce streaming for tool-free
 *   turns in a later cycle.
 *
 * Flow on each call:
 *   1. Auth-check user.
 *   2. Auth-check workspace membership for the supplied workspace_id.
 *   3. Pull the recent conversation tail from `ai_messages` (RLS-bypassed via
 *      admin client, but still tenant-scoped by the workspace membership we
 *      just verified).
 *   4. Persist the new user message.
 *   5. Run the Claude tool-use loop (max N iterations) — every model and tool
 *      turn gets persisted to ai_messages for audit + history.
 *   6. Return the final assistant text + the trace metadata.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import {
  getAnthropic,
  pickModel,
  cofoundrSystem,
  classifyMessage,
  type ClassifyResult,
} from "@/lib/anthropic";
import { saveAiMessage, recentTurns } from "@/lib/ai-messages";
import { TOOL_SCHEMAS, executeTool, type ToolContext } from "@/lib/tools";
import { costCents } from "@/lib/cost";
import { lookupCache, saveCache } from "@/lib/cache";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TOOL_ITERATIONS = 4;

const BodySchema = z.object({
  workspace_id: z.string().uuid(),
  message: z.string().min(1).max(8_000),
  tier: z.enum(["fast", "default", "strategy"]).optional(),
});

export async function POST(req: NextRequest) {
  // ----- 1. Auth ---------------------------------------------------------
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ----- 2. Validate -----------------------------------------------------
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Membership check via RLS-respecting client.
  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, jurisdiction")
    .eq("id", body.workspace_id)
    .maybeSingle();
  if (!ws) {
    return NextResponse.json({ error: "Workspace not found or no access" }, { status: 403 });
  }
  const workspace = ws as { id: string; jurisdiction: string | null };

  // ----- 3. Persist user turn -------------------------------------------
  await saveAiMessage({
    workspace_id: workspace.id,
    user_id: user.id,
    role: "user",
    content: body.message,
  });

  // ----- 4. Build the message tail --------------------------------------
  const history = await recentTurns(workspace.id);
  // history already contains the user message we just inserted; ensure it's last.
  const messages: Anthropic.Messages.MessageParam[] = history.map((h) => ({
    role: h.role,
    content: h.content,
  }));

  // ----- 5. Classify the turn (tier + cacheability + topic) -------------
  // The classifier is one cheap Haiku call; it tells us:
  //   - Which model tier to use (fast/default/strategy)
  //   - Whether this question is cacheable (general info, not user-specific)
  //   - The topic (drives cache TTL)
  let classification: ClassifyResult;
  if (body.tier) {
    classification = { tier: body.tier, cacheable: false, topic: "general" };
  } else {
    classification = await classifyMessage(body.message);
  }
  const { tier, cacheable, topic } = classification;

  // ----- 5a. Cache lookup (only on short conversations + cacheable) ------
  // We skip the cache once a conversation has built up real context, because
  // a cached "general info" answer would lose the user's prior turns.
  const isStartOfConvo = history.length <= 2; // includes the user msg we just saved
  if (cacheable && isStartOfConvo) {
    const hit = await lookupCache({
      question: body.message,
      jurisdiction: workspace.jurisdiction,
    });
    if (hit) {
      // Persist the cache-served assistant turn so history + audit are accurate.
      await saveAiMessage({
        workspace_id: workspace.id,
        user_id: user.id,
        role: "assistant",
        content: hit.answer,
        model: "kb_cache",
        tokens_in: 0,
        tokens_out: 0,
        cost_cents: 0,
        metadata: {
          cache_hit: true,
          cache_id: hit.id,
          cache_similarity: hit.similarity,
          cache_hit_count: hit.hit_count,
          tier,
          topic,
        },
      });

      return NextResponse.json({
        text: hit.answer,
        usage: {
          tokens_in: 0,
          tokens_out: 0,
          cost_cents: 0,
          model: "kb_cache",
          tier,
          cached: true,
          similarity: hit.similarity,
        },
      });
    }
  }

  // ----- 5b. Run the agent loop -----------------------------------------
  const anthropic = getAnthropic();
  const model = pickModel(tier);
  const system = cofoundrSystem({ jurisdiction: workspace.jurisdiction ?? undefined });

  const ctx: ToolContext = {
    workspace_id: workspace.id,
    user_id: user.id,
    jurisdiction: workspace.jurisdiction,
  };

  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let totalCost = 0;
  let finalText = "";

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    const resp = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      // Anthropic prompt caching: mark the static prefix (system prompt) as
      // cacheable so repeat turns read it from cache at ~10% of normal input
      // cost. The system prompt + Cofoundr persona is ~600-800 tokens; the
      // ephemeral cache lasts ~5 min between turns.
      system: [
        {
          type: "text",
          text: system,
          cache_control: { type: "ephemeral" },
        },
      ] as unknown as Anthropic.Messages.MessageCreateParams["system"],
      tools: TOOL_SCHEMAS as unknown as Anthropic.Messages.Tool[],
      messages,
    });

    const tIn = resp.usage.input_tokens;
    const tOut = resp.usage.output_tokens;
    const c = costCents(model, tIn, tOut);
    totalTokensIn += tIn;
    totalTokensOut += tOut;
    totalCost += c;

    const toolUses = resp.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
    );
    const textBlocks = resp.content.filter(
      (b): b is Anthropic.Messages.TextBlock => b.type === "text"
    );
    const assistantText = textBlocks.map((b) => b.text).join("\n").trim();

    // Persist this assistant turn (text + any tool requests, captured as JSON).
    await saveAiMessage({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "assistant",
      content: assistantText || `(tool calls: ${toolUses.map((t) => t.name).join(", ")})`,
      model,
      tokens_in: tIn,
      tokens_out: tOut,
      cost_cents: c,
      metadata: {
        stop_reason: resp.stop_reason,
        tool_calls: toolUses.map((t) => ({ name: t.name, id: t.id, input: t.input })),
        iteration: iter,
        tier,
      },
    });

    // Push the assistant message into the conversation regardless — required
    // for tool_result follow-ups to pair correctly.
    messages.push({ role: "assistant", content: resp.content });

    if (resp.stop_reason !== "tool_use" || toolUses.length === 0) {
      finalText = assistantText;
      break;
    }

    // Run every requested tool, append a tool_result content block per call.
    const toolResultBlocks: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const result = await executeTool(tu.name, tu.input, ctx);
      const payload = result.ok
        ? JSON.stringify(result.data).slice(0, 8_000)
        : JSON.stringify({ error: result.error });

      await saveAiMessage({
        workspace_id: workspace.id,
        user_id: user.id,
        role: "tool",
        content: payload,
        metadata: {
          tool_name: tu.name,
          tool_use_id: tu.id,
          ok: result.ok,
          input: tu.input,
        },
      });

      toolResultBlocks.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: payload,
        is_error: !result.ok,
      });
    }

    messages.push({ role: "user", content: toolResultBlocks });
  }

  if (!finalText) {
    finalText =
      "I had to use several tools and ran out of room to compose a final answer. Try asking me again — I'll do better now that I've gathered the data.";
  }

  // ----- 6. Save to cache if cacheable + on a fresh conversation ---------
  // We only cache the first turn's answer to avoid caching context-dependent
  // follow-ups. Fire-and-forget: failures don't block the response.
  if (cacheable && isStartOfConvo && finalText && finalText.length >= 40) {
    void saveCache({
      question: body.message,
      jurisdiction: workspace.jurisdiction,
      topic,
      answer: finalText,
      model_used: model,
      tokens_in: totalTokensIn,
      tokens_out: totalTokensOut,
      cost_cents: totalCost,
    });
  }

  return NextResponse.json({
    text: finalText,
    usage: {
      tokens_in: totalTokensIn,
      tokens_out: totalTokensOut,
      cost_cents: totalCost,
      model,
      tier,
      cached: false,
    },
  });
}
