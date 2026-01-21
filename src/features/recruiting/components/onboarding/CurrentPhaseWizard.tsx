// src/features/recruiting/components/onboarding/CurrentPhaseWizard.tsx
// Brutalist current phase - massive step number, harsh lines, gold accents

import { Clock, Lock, CheckCircle2 } from "lucide-react";

interface PhaseProgressItem {
  id: string;
  status: string;
  phase_id: string;
  started_at?: string | null;
}

interface CurrentPhaseWizardProps {
  currentPhaseName?: string;
  currentPhaseId?: string;
  currentPhaseIndex: number;
  isHidden: boolean;
  isBlocked: boolean;
  blockedReason?: string | null;
  notes?: string | null;
  checklistItemCount: number;
  completedItemCount: number;
  phaseProgress?: PhaseProgressItem[];
  children: React.ReactNode;
  className?: string;
}

export function CurrentPhaseWizard({
  currentPhaseName,
  currentPhaseIndex,
  isHidden,
  isBlocked,
  blockedReason,
  notes,
  checklistItemCount,
  completedItemCount,
  children,
}: CurrentPhaseWizardProps) {
  const phaseNumber = String(currentPhaseIndex + 1).padStart(2, "0");

  return (
    <section className="relative bg-[#0a0a0a] overflow-hidden rounded-lg">
      {/* Harsh grid background */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(to right, white 1px, transparent 1px),
            linear-gradient(to bottom, white 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Left vertical accent */}
      <div
        className="absolute top-0 bottom-0 left-0 w-[3px]"
        style={{ background: "var(--recruiting-primary)" }}
      />

      {/* Top gold line */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{ background: "var(--recruiting-primary)", opacity: 0.4 }}
      />

      <div className="relative z-10 p-4 md:p-6">
        {/* Header with massive number */}
        <div className="flex gap-4 md:gap-6 lg:gap-10 items-start mb-4 md:mb-6">
          {/* Massive phase number */}
          <span
            className="text-[18vw] md:text-[12vw] lg:text-[8vw] font-black leading-[0.7] tracking-tighter shrink-0"
            style={{
              color: "var(--recruiting-primary)",
              opacity: isHidden ? 0.15 : 0.3,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {phaseNumber}
          </span>

          {/* Phase info */}
          <div className="flex-1 pt-1 md:pt-2 lg:pt-4">
            {/* Index marker */}
            <span className="font-mono text-[10px] text-white/30 tracking-[0.3em] uppercase block mb-2 md:mb-3">
              [02] Current Phase
            </span>

            {/* Phase name */}
            <h2
              className="text-lg md:text-2xl lg:text-3xl xl:text-4xl font-black text-white uppercase tracking-tight mb-2 md:mb-3"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {isHidden ? (
                <span className="flex items-center gap-2 md:gap-3 text-white/50">
                  <Lock className="h-5 w-5 md:h-6 md:w-6" />
                  Admin Action
                </span>
              ) : (
                currentPhaseName || "Unknown Phase"
              )}
            </h2>

            {/* Progress stat */}
            {!isHidden && checklistItemCount > 0 && (
              <p className="text-white/40 text-xs md:text-sm font-mono uppercase tracking-wider">
                <span style={{ color: "var(--recruiting-primary)" }}>
                  {completedItemCount}
                </span>
                <span className="text-white/30">/{checklistItemCount}</span>{" "}
                Tasks Complete
              </p>
            )}

            {/* Instructions callout - hidden on mobile for cleaner look */}
            {!isHidden && checklistItemCount > 0 && (
              <div
                className="hidden md:block mt-3 md:mt-4 py-2 md:py-3 px-3 md:px-4 border-l-2"
                style={{
                  borderColor: "var(--recruiting-primary)",
                  background: "rgba(var(--recruiting-primary-rgb), 0.05)",
                }}
              >
                <p className="text-white/50 text-[11px] md:text-xs font-mono leading-relaxed">
                  → Click checkboxes to mark tasks complete
                  <br />→ Upload required documents when prompted
                  <br />→ Message your recruiter if you need help
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Hidden phase state */}
        {isHidden ? (
          <div className="py-12 text-center border-t border-white/10">
            <Clock
              className="h-12 w-12 mx-auto mb-4"
              style={{ color: "var(--recruiting-primary)", opacity: 0.6 }}
            />
            <p
              className="text-xl font-black uppercase tracking-tight mb-2"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: "var(--recruiting-primary)",
              }}
            >
              In Progress
            </p>
            <p className="text-white/40 text-sm font-mono max-w-md mx-auto">
              This phase is being handled by your recruiter.
              <br />
              You&apos;ll be notified when action is needed.
            </p>
          </div>
        ) : checklistItemCount > 0 ? (
          <div className="border-t border-white/10 pt-4 recruiting-checklist-wrapper">
            {children}
          </div>
        ) : (
          <div className="py-8 text-center border-t border-white/10">
            <CheckCircle2
              className="h-10 w-10 mx-auto mb-3"
              style={{ color: "var(--recruiting-primary)" }}
            />
            <p className="text-white/40 text-sm font-mono">
              No tasks for this phase
            </p>
          </div>
        )}

        {/* Notes */}
        {!isHidden && notes && (
          <div className="mt-4 py-3 px-4 bg-white/5 border border-white/10 rounded">
            <span className="font-mono text-[10px] text-white/30 tracking-[0.2em] uppercase">
              [Note]
            </span>
            <p className="text-white/60 text-sm mt-1">{notes}</p>
          </div>
        )}

        {/* Blocked reason */}
        {isBlocked && blockedReason && (
          <div className="mt-4 py-3 px-4 bg-red-950/30 border border-red-500/30 rounded">
            <span className="font-mono text-[10px] text-red-400/70 tracking-[0.2em] uppercase">
              [Blocked]
            </span>
            <p className="text-red-400 text-sm mt-1">{blockedReason}</p>
          </div>
        )}
      </div>
    </section>
  );
}

// Empty state component when no current phase
export function NoCurrentPhase() {
  return (
    <section className="relative bg-[#0a0a0a] overflow-hidden rounded-lg">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(to right, white 1px, transparent 1px),
            linear-gradient(to bottom, white 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 py-16 text-center">
        <span
          className="text-[30vw] md:text-[20vw] font-black leading-[0.7] tracking-tighter opacity-10"
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: "var(--recruiting-primary)",
          }}
        >
          00
        </span>
        <p className="text-white/30 text-sm font-mono uppercase tracking-widest -mt-8">
          No Active Phase
        </p>
      </div>
    </section>
  );
}
