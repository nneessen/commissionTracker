// src/features/underwriting/components/WizardDialogLayout.tsx

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WizardStep } from "../types/underwriting.types";
import { WIZARD_STEPS } from "../types/underwriting.types";

interface WizardDialogLayoutProps {
  currentStep: WizardStep;
  children: React.ReactNode;
  onStepClick?: (step: WizardStep) => void;
  canNavigateToStep?: (step: WizardStep) => boolean;
}

export function WizardDialogLayout({
  currentStep,
  children,
  onStepClick,
  canNavigateToStep,
}: WizardDialogLayoutProps) {
  const currentStepIndex = WIZARD_STEPS.findIndex((s) => s.id === currentStep);

  const getStepStatus = (stepId: WizardStep) => {
    const stepIndex = WIZARD_STEPS.findIndex((s) => s.id === stepId);
    if (stepIndex < currentStepIndex) return "completed";
    if (stepIndex === currentStepIndex) return "current";
    return "upcoming";
  };

  const handleStepClick = (stepId: WizardStep) => {
    if (!onStepClick) return;
    if (canNavigateToStep && !canNavigateToStep(stepId)) return;
    onStepClick(stepId);
  };

  const currentStepConfig = WIZARD_STEPS.find((s) => s.id === currentStep);

  return (
    <div className="flex h-[85vh] overflow-hidden">
      {/* Left Panel - Branding & Step Navigation */}
      <div className="hidden lg:flex lg:w-[280px] xl:w-[320px] bg-foreground relative overflow-hidden flex-shrink-0">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="wizard-grid"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 32 0 L 0 0 0 32"
                  fill="none"
                  stroke="white"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#wizard-grid)" />
          </svg>
        </div>

        {/* Animated glow orbs */}
        <div className="absolute top-1/4 -left-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/4 -right-16 w-56 h-56 bg-amber-400/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-6 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/20 rounded-lg blur-lg group-hover:bg-amber-500/30 transition-all duration-500" />
              <img
                src="/logos/Light Letter Logo .png"
                alt="The Standard"
                className="relative h-10 w-10 drop-shadow-xl dark:hidden"
              />
              <img
                src="/logos/LetterLogo.png"
                alt="The Standard"
                className="relative h-10 w-10 drop-shadow-xl hidden dark:block"
              />
            </div>
            <div className="flex flex-col">
              <span
                className="text-white dark:text-black text-lg font-bold tracking-wide"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Underwriting
              </span>
              <span className="text-amber-400 text-[9px] uppercase tracking-[0.2em] font-medium">
                Quick Quote Wizard
              </span>
            </div>
          </div>

          {/* Step Navigation */}
          <nav className="flex-1 py-8">
            <div className="space-y-1">
              {WIZARD_STEPS.map((stepConfig, index) => {
                const status = getStepStatus(stepConfig.id);
                const isClickable =
                  onStepClick &&
                  (canNavigateToStep
                    ? canNavigateToStep(stepConfig.id)
                    : status !== "upcoming");

                return (
                  <button
                    key={stepConfig.id}
                    onClick={() => handleStepClick(stepConfig.id)}
                    disabled={!isClickable}
                    className={cn(
                      "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all text-left",
                      status === "current" &&
                        "bg-white/10 dark:bg-black/10 border border-amber-500/30",
                      status === "completed" &&
                        isClickable &&
                        "hover:bg-white/5 dark:hover:bg-black/5 cursor-pointer",
                      status === "upcoming" && "opacity-50",
                      isClickable && status !== "current" && "cursor-pointer",
                    )}
                  >
                    {/* Step indicator */}
                    <div
                      className={cn(
                        "flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors flex-shrink-0 mt-0.5",
                        status === "completed" &&
                          "bg-amber-500/20 text-amber-400 border border-amber-500/30",
                        status === "current" &&
                          "bg-amber-500 text-zinc-900 shadow-lg shadow-amber-500/30",
                        status === "upcoming" &&
                          "bg-white/10 dark:bg-black/10 text-white/50 dark:text-black/50 border border-white/10 dark:border-black/10",
                      )}
                    >
                      {status === "completed" ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        index + 1
                      )}
                    </div>

                    {/* Step text */}
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "text-sm font-medium truncate",
                          status === "current"
                            ? "text-white dark:text-black"
                            : status === "completed"
                              ? "text-white/80 dark:text-black/80"
                              : "text-white/40 dark:text-black/40",
                        )}
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {stepConfig.label}
                      </div>
                      {stepConfig.description && (
                        <div
                          className={cn(
                            "text-[10px] truncate",
                            status === "current"
                              ? "text-amber-400"
                              : "text-white/40 dark:text-black/40",
                          )}
                        >
                          {stepConfig.description}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] text-white/50 dark:text-black/50">
              <span>Progress</span>
              <span>
                {currentStepIndex + 1} of {WIZARD_STEPS.length}
              </span>
            </div>
            <div className="h-1.5 bg-white/10 dark:bg-black/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${((currentStepIndex + 1) / WIZARD_STEPS.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Mobile step indicator */}
        <div className="lg:hidden flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-1.5">
            {WIZARD_STEPS.map((stepConfig) => {
              const status = getStepStatus(stepConfig.id);
              return (
                <div
                  key={stepConfig.id}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    status === "completed" && "bg-amber-500",
                    status === "current" &&
                      "bg-amber-500 ring-2 ring-amber-500/30",
                    status === "upcoming" && "bg-zinc-300 dark:bg-zinc-600",
                  )}
                />
              );
            })}
          </div>
          <div className="flex-1 text-xs text-muted-foreground">
            Step {currentStepIndex + 1}: {currentStepConfig?.label}
          </div>
        </div>

        {/* Form container - flex column to allow sticky footer */}
        <div className="flex-1 flex flex-col min-h-0">{children}</div>
      </div>
    </div>
  );
}

export default WizardDialogLayout;
