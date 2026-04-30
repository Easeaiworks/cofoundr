import { Check, Hourglass, Lock, Circle } from "lucide-react";
import type { JourneyStep } from "@/lib/journey";

/**
 * Right-rail Launch Journey sidebar. Shows where the founder stands across
 * the canonical 8-step launch arc, with the current step highlighted and
 * upcoming/locked steps muted. Reinforces engagement.
 */
export function JourneySidebar({
  steps,
  doneCount,
  totalCount,
}: {
  steps: JourneyStep[];
  doneCount: number;
  totalCount: number;
}) {
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <aside className="rounded-2xl border border-accent-100 bg-white shadow-sm sticky top-[88px] self-start">
      <div className="p-5 border-b border-accent-100">
        <p className="text-[11px] uppercase tracking-wider text-accent">Launch Journey</p>
        <h2 className="mt-1 text-base font-semibold text-ink">Your progress</h2>
        <div className="mt-3">
          <div className="h-2 rounded-full bg-accent-50 overflow-hidden">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {doneCount} of {totalCount} steps · {pct}% complete
          </p>
        </div>
      </div>

      <ol className="p-2">
        {steps.map((step, i) => (
          <Step
            key={step.id}
            step={step}
            number={i + 1}
            isLast={i === steps.length - 1}
          />
        ))}
      </ol>

      <div className="p-4 border-t border-accent-100 bg-canvas rounded-b-2xl">
        <p className="text-[11px] text-ink-muted leading-relaxed">
          Steps update automatically as you complete things in chat.
          Ask Cofoundr what to tackle next anytime.
        </p>
      </div>
    </aside>
  );
}

function Step({
  step,
  number,
  isLast,
}: {
  step: JourneyStep;
  number: number;
  isLast: boolean;
}) {
  const styles = stylesForStatus(step.status);
  return (
    <li
      className={[
        "relative flex gap-3 px-3 py-2.5 rounded-lg",
        step.status === "current" ? "bg-accent-50" : "",
      ].join(" ")}
    >
      {/* connector line */}
      {!isLast && (
        <span
          className="absolute left-[26px] top-9 bottom-0 w-px bg-accent-100"
          aria-hidden
        />
      )}

      <span
        className={[
          "shrink-0 grid place-items-center h-7 w-7 rounded-full border z-10",
          styles.iconBg,
        ].join(" ")}
        aria-hidden
      >
        {styles.icon}
      </span>

      <div className="min-w-0">
        <p className={["text-sm font-medium leading-tight", styles.title].join(" ")}>
          <span className="text-ink-muted mr-1">{number}.</span>
          {step.title}
        </p>
        <p className={["text-[12px] mt-0.5 leading-snug", styles.hint].join(" ")}>
          {step.hint}
        </p>
      </div>
    </li>
  );
}

function stylesForStatus(status: JourneyStep["status"]) {
  switch (status) {
    case "done":
      return {
        iconBg: "bg-accent text-white border-accent",
        icon: <Check className="h-4 w-4" />,
        title: "text-ink line-through decoration-accent/40",
        hint: "text-ink-muted",
      };
    case "current":
      return {
        iconBg: "bg-white text-accent border-accent",
        icon: <Hourglass className="h-4 w-4" />,
        title: "text-accent",
        hint: "text-ink",
      };
    case "locked":
      return {
        iconBg: "bg-canvas text-ink-muted border-accent-100",
        icon: <Lock className="h-3.5 w-3.5" />,
        title: "text-ink-muted",
        hint: "text-ink-muted/70",
      };
    case "upcoming":
    default:
      return {
        iconBg: "bg-white text-ink-muted border-accent-100",
        icon: <Circle className="h-3.5 w-3.5" />,
        title: "text-ink-muted",
        hint: "text-ink-muted/70",
      };
  }
}
