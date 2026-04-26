"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createWorkspaceAction, saveIdeaAction } from "./actions";

type Step = 1 | 2;

const JURISDICTIONS = [
  { code: "CA-ON", label: "Ontario, Canada" },
  { code: "CA-BC", label: "British Columbia, Canada" },
  { code: "CA-AB", label: "Alberta, Canada" },
  { code: "CA-QC", label: "Quebec, Canada" },
  { code: "CA-OTHER", label: "Other Canadian province / territory" },
  { code: "US-DE", label: "Delaware, USA" },
  { code: "US-CA", label: "California, USA" },
  { code: "US-TX", label: "Texas, USA" },
  { code: "US-FL", label: "Florida, USA" },
  { code: "US-NY", label: "New York, USA" },
  { code: "US-OTHER", label: "Other US state" },
];

export function OnboardingWizard({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  async function onStep1(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await createWorkspaceAction(fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setWorkspaceId(res.workspace_id ?? null);
    setStep(2);
  }

  async function onStep2(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await saveIdeaAction(fd);
    setPending(false);
    if (!res || !res.ok) {
      setError((res && !res.ok && res.error) || "Something went wrong");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="rounded-2xl border border-accent-100 bg-white p-6 md:p-8 shadow-sm">
      <div className="mb-6 flex items-center gap-2 text-xs">
        <Pill active={step >= 1}>1. Workspace</Pill>
        <span className="text-ink-muted">→</span>
        <Pill active={step >= 2}>2. Your idea</Pill>
        <span className="text-ink-muted">→</span>
        <Pill active={false}>3. Meet Cofoundr</Pill>
      </div>

      {step === 1 && (
        <form onSubmit={onStep1} className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-ink">Name your workspace</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Usually the working name of the business you&rsquo;re building.
              You can change this later.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1" htmlFor="name">
              Workspace name
            </label>
            <Input id="name" name="name" required minLength={2} maxLength={80}
              placeholder="e.g. Mariposa Candle Co." autoFocus />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1" htmlFor="jurisdiction">
              Where are you (or planning to register)?
            </label>
            <select id="jurisdiction" name="jurisdiction" required
              defaultValue="CA-ON"
              className="h-11 w-full rounded-lg border border-accent-100 bg-white px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400">
              {JURISDICTIONS.map((j) => (
                <option key={j.code} value={j.code}>{j.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-muted">
              We&rsquo;re launching with full guidance for Ontario and Delaware.
              Other jurisdictions get general advice for now; full support is rolling out.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <p className="text-xs text-ink-muted">Signed in as {userEmail}.</p>

          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Creating…" : "Continue"}
          </Button>
        </form>
      )}

      {step === 2 && workspaceId && (
        <form onSubmit={onStep2} className="space-y-5">
          <input type="hidden" name="workspace_id" value={workspaceId} />

          <div>
            <h2 className="text-xl font-semibold text-ink">Tell me about your idea</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Six quick questions. Your answers seed the first conversation with
              Cofoundr; you can edit any of this later.
            </p>
          </div>

          <Field label="What kinds of products, services, or industries interest you?">
            <textarea name="interests" required minLength={2} maxLength={500}
              rows={3} placeholder="e.g. handmade candles, weekend pop-ups, sustainable packaging"
              className="w-full rounded-lg border border-accent-100 bg-white px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400" />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Starting budget">
              <Select name="budget" required options={[
                "Under $500", "$500 – $2,000", "$2,000 – $10,000",
                "$10,000 – $50,000", "$50,000+",
              ]} />
            </Field>
            <Field label="Time per week you can give it">
              <Select name="time_per_week" required options={[
                "<5 hrs (side, evenings)", "5–15 hrs (serious side)",
                "15–35 hrs (transitioning)", "Full-time",
              ]} />
            </Field>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <RadioGroup name="online_or_local" label="Online or local?" options={[
              { value: "online", label: "Online" },
              { value: "local", label: "Local" },
              { value: "both", label: "Both" },
            ]} />
            <RadioGroup name="product_or_service" label="Product or service?" options={[
              { value: "product", label: "Product" },
              { value: "service", label: "Service" },
              { value: "both", label: "Both" },
            ]} />
            <RadioGroup name="ambition" label="Goal" options={[
              { value: "side_income", label: "Side income" },
              { value: "full_time", label: "Full-time job" },
              { value: "scale", label: "Build to scale" },
            ]} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? "Saving…" : "Meet Cofoundr"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function Pill({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span className={
      "inline-block rounded-full px-3 py-1 text-xs " +
      (active
        ? "bg-accent-50 text-accent border border-accent-100"
        : "bg-canvas text-ink-muted border border-accent-100")
    }>{children}</span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-1">{label}</label>
      {children}
    </div>
  );
}

function Select({ name, required, options }: {
  name: string; required?: boolean; options: string[];
}) {
  return (
    <select name={name} required={required} defaultValue=""
      className="h-11 w-full rounded-lg border border-accent-100 bg-white px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400">
      <option value="" disabled>Choose one…</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function RadioGroup({ name, label, options }: {
  name: string; label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <fieldset>
      <legend className="block text-sm font-medium text-ink mb-1">{label}</legend>
      <div className="grid grid-cols-1 gap-2">
        {options.map((o, i) => (
          <label key={o.value} className="flex items-center gap-2 rounded-lg border border-accent-100 bg-white px-3 py-2 text-sm cursor-pointer hover:bg-accent-50">
            <input type="radio" name={name} value={o.value} required={i === 0} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
