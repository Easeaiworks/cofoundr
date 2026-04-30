"use client";

import Link from "next/link";
import { useState } from "react";
import { Home, ChevronDown, Plus, Check, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

type WorkspaceLite = { id: string; name: string; slug: string };

/**
 * Sticky topbar shown above the chat. Persistent context so the user never
 * loses where they are: workspace name, jurisdiction, current journey step,
 * a workspace switcher (up to 3 ideas), a Home button, and sign-out.
 */
export function DashboardTopbar({
  workspaceName,
  workspaceSlug,
  jurisdictionLabel,
  stageLabel,
  currentStepTitle,
  doneCount,
  totalCount,
  userEmail,
  allWorkspaces,
  canAddMore,
}: {
  workspaceName: string;
  workspaceSlug: string;
  jurisdictionLabel: string | null;
  stageLabel: string;
  currentStepTitle: string;
  doneCount: number;
  totalCount: number;
  userEmail: string;
  allWorkspaces: WorkspaceLite[];
  canAddMore: boolean;
}) {
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const [switcherOpen, setSwitcherOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-accent-100 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="container max-w-6xl py-3 flex items-center justify-between gap-4">
        {/* Left: brand + Home button + workspace switcher */}
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/home"
            className="flex items-center gap-2 shrink-0"
            aria-label="Home"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white text-sm font-bold">
              c
            </span>
            <span className="hidden sm:inline font-semibold tracking-tight text-ink">
              Cofoundr
            </span>
          </Link>

          <Link
            href="/home"
            className="hidden sm:inline-flex items-center gap-1 rounded-md border border-accent-100 px-2.5 py-1.5 text-xs text-ink hover:bg-accent-50"
            aria-label="Home"
          >
            <Home className="h-3.5 w-3.5" />
            Home
          </Link>

          <span className="text-ink-muted">/</span>

          {/* Workspace switcher */}
          <div className="relative min-w-0">
            <button
              type="button"
              onClick={() => setSwitcherOpen((s) => !s)}
              className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent-50 min-w-0 max-w-[260px]"
            >
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold text-ink truncate">
                  {workspaceName}
                </p>
                <p className="text-[11px] text-ink-muted truncate">
                  {jurisdictionLabel ?? "Jurisdiction not set"} · {stageLabel}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-ink-muted transition-transform shrink-0",
                  switcherOpen && "rotate-180"
                )}
              />
            </button>

            {switcherOpen && (
              <>
                <button
                  className="fixed inset-0 z-40"
                  onClick={() => setSwitcherOpen(false)}
                  aria-label="Close menu"
                />
                <div className="absolute z-50 left-0 mt-1 w-72 rounded-xl border border-accent-100 bg-white shadow-lg overflow-hidden">
                  <div className="p-2">
                    <p className="px-2 pt-1 pb-2 text-[10px] uppercase tracking-wider text-ink-muted">
                      Your ideas ({allWorkspaces.length}/3)
                    </p>
                    {allWorkspaces.map((w) => (
                      <Link
                        key={w.id}
                        href={`/dashboard?w=${w.slug}`}
                        className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm text-ink hover:bg-accent-50"
                        onClick={() => setSwitcherOpen(false)}
                      >
                        <span className="truncate">{w.name}</span>
                        {w.slug === workspaceSlug && (
                          <Check className="h-4 w-4 text-accent shrink-0" />
                        )}
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-accent-100 p-2">
                    {canAddMore ? (
                      <Link
                        href="/onboarding?new=1"
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-accent hover:bg-accent-50"
                        onClick={() => setSwitcherOpen(false)}
                      >
                        <Plus className="h-4 w-4" />
                        New idea
                      </Link>
                    ) : (
                      <p className="px-2 py-2 text-xs text-ink-muted">
                        You&rsquo;ve reached 3 ideas — archive one to start another.
                      </p>
                    )}
                    <Link
                      href="/home"
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-ink hover:bg-accent-50"
                      onClick={() => setSwitcherOpen(false)}
                    >
                      <Home className="h-4 w-4" />
                      All ideas
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Middle: current step + progress */}
        <div className="hidden md:flex flex-1 max-w-md items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-ink-muted">Up next</p>
            <p className="text-sm font-medium text-ink truncate">{currentStepTitle}</p>
          </div>
          <div className="w-28 shrink-0">
            <div className="h-1.5 rounded-full bg-accent-50 overflow-hidden">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${pct}%` }}
                aria-label={`${pct}% complete`}
              />
            </div>
            <p className="mt-1 text-[10px] text-ink-muted text-right">
              {doneCount}/{totalCount} steps · {pct}%
            </p>
          </div>
        </div>

        {/* Right: user + sign out */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden lg:inline text-xs text-ink-muted">{userEmail}</span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md border border-accent-100 px-3 py-1.5 text-xs text-ink hover:bg-accent-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
