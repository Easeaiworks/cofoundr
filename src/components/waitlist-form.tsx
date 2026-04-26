"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Status = "idle" | "submitting" | "ok" | "error";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [intent, setIntent] = useState<"starting" | "running" | "agency">("starting");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, intent }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Something went wrong");
      }
      setStatus("ok");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  if (status === "ok") {
    return (
      <div className="rounded-xl border border-accent-100 bg-accent-50 p-5 text-sm text-ink">
        <p className="font-semibold mb-1">You&rsquo;re on the list.</p>
        <p className="text-ink-muted">
          We&rsquo;ll email you the moment Cofoundr opens for design partners.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Input
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <fieldset className="grid grid-cols-3 gap-2">
        {(
          [
            { v: "starting", label: "I'm starting" },
            { v: "running", label: "Already running" },
            { v: "agency", label: "I help others" },
          ] as const
        ).map(({ v, label }) => (
          <label
            key={v}
            className={
              "cursor-pointer rounded-lg border px-3 py-2 text-xs text-center transition-colors " +
              (intent === v
                ? "border-accent bg-accent-50 text-accent"
                : "border-accent-100 text-ink hover:bg-accent-50")
            }
          >
            <input
              type="radio"
              className="sr-only"
              name="intent"
              value={v}
              checked={intent === v}
              onChange={() => setIntent(v)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <Button type="submit" disabled={status === "submitting"} className="w-full" size="lg">
        {status === "submitting" ? "Joining…" : "Join the waitlist"}
      </Button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <p className="text-xs text-ink-muted">
        We&rsquo;ll only email you about Cofoundr. Unsubscribe with one click.
      </p>
    </form>
  );
}
