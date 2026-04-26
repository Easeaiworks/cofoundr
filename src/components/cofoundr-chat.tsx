"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

type Msg = { role: "user" | "assistant"; content: string };

export function CofoundrChat({
  workspaceId,
  jurisdiction,
  ideaContext,
}: {
  workspaceId: string;
  jurisdiction: string | null;
  ideaContext: { title: string; metadata: Record<string, unknown> } | null;
}) {
  const [messages, setMessages] = useState<Msg[]>(() => seedMessages(ideaContext, jurisdiction));
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;

    const userMsg: Msg = { role: "user", content: input.trim() };
    const next = [...messages.filter((m) => m.role !== "assistant" || m.content), userMsg];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,                 // only user/assistant turns; system prompt is server-side
          jurisdiction: jurisdiction ?? undefined,
        }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch (err) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content:
            "Sorry — I couldn't reach my brain just now. Check that ANTHROPIC_API_KEY is set and try again.",
        };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
    // workspaceId is reserved for the next iteration where we persist messages
    // to ai_messages and audit_log. Held intentionally.
    void workspaceId;
  }

  return (
    <div className="rounded-2xl border border-accent-100 bg-white shadow-sm flex flex-col h-[70vh] min-h-[480px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} content={m.content} streaming={streaming && i === messages.length - 1 && m.role === "assistant"} />
        ))}
      </div>

      <form onSubmit={send} className="border-t border-accent-100 p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Cofoundr anything — &ldquo;What entity should I register? Draft my privacy policy. Find me 3 niches.&rdquo;"
          className="flex-1 h-11 rounded-lg border border-accent-100 bg-white px-3 text-sm text-ink placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
          disabled={streaming}
        />
        <Button type="submit" disabled={streaming || !input.trim()}>
          {streaming ? "Thinking…" : "Send"}
        </Button>
      </form>

      <p className="px-5 pb-3 text-[11px] text-ink-muted">
        AI guidance only. Cofoundr is not a law firm, accounting firm, or financial advisor.
      </p>
    </div>
  );
}

function Bubble({
  role, content, streaming,
}: { role: "user" | "assistant"; content: string; streaming: boolean }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-accent text-white px-4 py-2 text-sm">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl bg-accent-50 border border-accent-100 px-4 py-3 text-sm text-ink whitespace-pre-wrap">
        {content || <span className="text-ink-muted italic">{streaming ? "thinking…" : ""}</span>}
      </div>
    </div>
  );
}

function seedMessages(
  ideaContext: { title: string; metadata: Record<string, unknown> } | null,
  jurisdiction: string | null
): Msg[] {
  if (!ideaContext) {
    return [{
      role: "assistant",
      content:
        "Hi — I'm Cofoundr.\n\nI'll be your AI co-founder while you build this business. Ask me anything: what entity to register, how to validate the idea, draft contracts, write your launch copy, plan your first 30 days. What's on your mind first?",
    }];
  }

  const m = ideaContext.metadata as Record<string, string>;
  const where = jurisdictionLabel(jurisdiction);
  const summary = [
    m.interests ? `Interests: ${m.interests}.` : null,
    m.budget ? `Starting budget: ${m.budget}.` : null,
    m.time_per_week ? `Time available: ${m.time_per_week}.` : null,
    m.online_or_local ? `Reach: ${m.online_or_local}.` : null,
    m.product_or_service ? `Offer: ${m.product_or_service}.` : null,
    m.ambition ? `Goal: ${humanizeAmbition(m.ambition)}.` : null,
  ].filter(Boolean).join(" ");

  return [{
    role: "assistant",
    content:
      `Welcome — I&rsquo;ve got your intake.\n\n${summary}${where ? "\nJurisdiction: " + where + "." : ""}\n\nGood place to start: do you want me to (1) suggest 3 specific niches that fit those constraints, (2) recommend the right legal structure to register, or (3) help you settle on a name and check domain availability? Tell me which one and we&rsquo;ll go.`,
  }];
}

function jurisdictionLabel(code: string | null): string | null {
  if (!code) return null;
  const map: Record<string, string> = {
    "CA-ON": "Ontario, Canada",
    "CA-BC": "British Columbia, Canada",
    "CA-AB": "Alberta, Canada",
    "CA-QC": "Quebec, Canada",
    "US-DE": "Delaware, USA",
    "US-CA": "California, USA",
    "US-TX": "Texas, USA",
    "US-FL": "Florida, USA",
    "US-NY": "New York, USA",
  };
  return map[code] ?? code;
}

function humanizeAmbition(a: string): string {
  return ({
    side_income: "side income",
    full_time: "full-time job",
    scale: "build to scale",
  } as Record<string, string>)[a] ?? a;
}
