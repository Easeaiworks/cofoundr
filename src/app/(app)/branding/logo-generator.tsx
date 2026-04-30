"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type GenResult = {
  logos: { url: string; document_id: string }[];
  used: number;
  limit: number;
};

export function LogoGenerator({
  workspaceId,
  defaultBrandName,
}: {
  workspaceId: string;
  defaultBrandName: string;
}) {
  const router = useRouter();
  const [brand, setBrand] = useState(defaultBrandName);
  const [industry, setIndustry] = useState("");
  const [vibe, setVibe] = useState("");
  const [colorHint, setColorHint] = useState("");
  const [style, setStyle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/branding/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          brand_name: brand.trim(),
          industry: industry.trim() || undefined,
          vibe: vibe.trim() || undefined,
          color_hint: colorHint.trim() || undefined,
          style: style.trim() || undefined,
          variants: 4,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setResult(json);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-accent-100 bg-white p-6">
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Brand name *">
          <Input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            required
            minLength={2}
            maxLength={80}
            placeholder="Mariposa Candle Co."
          />
        </Field>
        <Field label="Industry">
          <Input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            maxLength={80}
            placeholder="hand-poured candles"
          />
        </Field>
        <Field label="Vibe">
          <Input
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            maxLength={160}
            placeholder="modern, sustainable, premium"
          />
        </Field>
        <Field label="Color palette">
          <Input
            value={colorHint}
            onChange={(e) => setColorHint(e.target.value)}
            maxLength={120}
            placeholder="deep teal and warm cream"
          />
        </Field>
        <Field label="Style" className="md:col-span-2">
          <Input
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            maxLength={120}
            placeholder="geometric minimal mark with serif wordmark"
          />
        </Field>

        <div className="md:col-span-2 flex items-center gap-3 pt-2">
          <Button type="submit" disabled={pending || !brand.trim()} size="lg">
            {pending ? "Generating 4 concepts… (~10 sec)" : "Generate 4 concepts"}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </form>

      {result && (
        <div className="mt-6 pt-6 border-t border-accent-100">
          <p className="text-xs text-ink-muted mb-3">
            Used {result.used} of {result.limit} daily generations.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {result.logos.map((l, i) => (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl border border-accent-100 bg-white p-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={l.url}
                  alt={`Concept ${i + 1}`}
                  className="w-full aspect-square rounded-lg object-contain bg-canvas"
                />
                <p className="mt-2 text-[11px] text-ink-muted">
                  Concept {i + 1} · click to open
                </p>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-ink mb-1">{label}</label>
      {children}
    </div>
  );
}
