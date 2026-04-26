"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { publicEnv } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        shouldCreateUser: true,
      },
    });

    if (err) {
      setStatus("error");
      setError(err.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-canvas px-4">
      <div className="w-full max-w-md rounded-2xl border border-accent-100 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-ink mb-1">Sign in to Cofoundr</h1>
        <p className="text-sm text-ink-muted mb-6">
          We&rsquo;ll email you a magic link. No password.
        </p>

        {status === "sent" ? (
          <div className="rounded-lg bg-accent-50 border border-accent-100 p-4 text-sm text-ink">
            Check <strong>{email}</strong> for your sign-in link. You can close this tab.
          </div>
        ) : (
          <form onSubmit={send} className="space-y-4">
            <Input
              type="email"
              required
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" disabled={status === "sending"} className="w-full">
              {status === "sending" ? "Sending…" : "Send magic link"}
            </Button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
