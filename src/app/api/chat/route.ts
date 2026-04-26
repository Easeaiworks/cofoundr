import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, pickModel, cofoundrSystem } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(20_000),
      })
    )
    .min(1),
  tier: z.enum(["fast", "default", "strategy"]).optional(),
  jurisdiction: z.string().optional(),
});

/**
 * Streaming chat endpoint.
 *
 * Auth-gated: only signed-in users get to call Claude. Workspace scoping for
 * conversation persistence and tool use lands in the next build cycle.
 */
export async function POST(req: NextRequest) {
  // 1. Auth.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate.
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // 3. Stream Claude → SSE-ish text stream.
  const anthropic = getAnthropic();
  const model = pickModel(body.tier);

  const stream = await anthropic.messages.stream({
    model,
    max_tokens: 2048,
    system: cofoundrSystem({ jurisdiction: body.jurisdiction }),
    messages: body.messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        controller.error(err);
        return;
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
