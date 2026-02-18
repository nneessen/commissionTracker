// src/features/recruiting/components/onboarding/WelcomeHero.tsx
// Brutalist welcome hero - massive progress number, harsh grid, gold accents

import { Upload, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PhaseProgressItem {
  id: string;
  status: string;
  phase_id: string;
  started_at?: string | null;
}

interface WelcomeHeroProps {
  firstName?: string | null;
  lastName?: string | null;
  agencyName?: string | null;
  profilePhotoUrl?: string | null;
  progressPercentage: number;
  currentPhaseName?: string | null;
  phaseProgress?: PhaseProgressItem[];
  uploadingPhoto: boolean;
  onPhotoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function WelcomeHero({
  firstName,
  lastName,
  agencyName,
  profilePhotoUrl,
  progressPercentage,
  currentPhaseName,
  phaseProgress,
  uploadingPhoto,
  onPhotoUpload,
}: WelcomeHeroProps) {
  const completedPhases =
    phaseProgress?.filter((p) => p.status === "completed").length || 0;
  const totalPhases = phaseProgress?.length || 0;

  return (
    <section className="relative bg-[#0a0a0a] overflow-hidden rounded-lg">
      {/* Harsh grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, white 1px, transparent 1px),
            linear-gradient(to bottom, white 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Diagonal accent line */}
      <div
        className="absolute top-0 right-[15%] w-[2px] h-[300%] origin-top rotate-[-35deg]"
        style={{ background: "var(--recruiting-primary)" }}
      />

      {/* Bottom accent bar */}
      <div
        className="absolute bottom-0 left-0 h-[3px] transition-all duration-700"
        style={{
          width: `${progressPercentage}%`,
          background: "var(--recruiting-primary)",
        }}
      />

      <div className="relative z-10 px-4 md:px-6 py-6 md:py-8 lg:py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Left: Welcome text + stats */}
          <div className="flex-1">
            {/* Index marker */}
            <span className="font-mono text-[10px] text-white/30 tracking-[0.3em] uppercase block mb-3 md:mb-4">
              [01] The Standard Onboarding Portal
            </span>

            {/* Welcome */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 md:h-24 md:w-24 border-2 shrink-0" style={{ borderColor: "var(--recruiting-primary)" }}>
                <AvatarImage src={profilePhotoUrl || undefined} />
                <AvatarFallback className="bg-white/10 text-white text-lg font-bold">
                  {(firstName?.[0] || "")}{(lastName?.[0] || "")}
                </AvatarFallback>
              </Avatar>
              <h1
                className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight text-white uppercase leading-[0.9]"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                <span className="block text-white/60">
                  Welcome to {agencyName || "The Standard"},
                </span>
                <span style={{ color: "var(--recruiting-primary)" }}>
                  {firstName || "Recruit"}
                  {lastName ? ` ${lastName}` : ""}
                </span>
              </h1>
            </div>

            {/* Subtitle */}
            <p className="mt-3 text-white/40 text-xs md:text-sm max-w-md">
              Complete your onboarding steps below to get started with your
              career at {agencyName || "The Standard"}.
            </p>

            {/* Pipeline-only notice */}
            <p className="mt-2 text-white/25 text-[10px] md:text-xs max-w-lg leading-relaxed">
              This is your onboarding pipeline — it tracks your progress through
              training and bootcamp. You won&apos;t have full access to the
              application until your upline graduates you as an active agent
              with an NPN. Until then, this is your home base.
            </p>

            {/* Current phase */}
            {currentPhaseName && (
              <p className="mt-3 md:mt-4 text-white/40 text-xs md:text-sm font-mono uppercase tracking-wider">
                Current Phase:{" "}
                <span className="text-white/70">{currentPhaseName}</span>
              </p>
            )}

            {/* Stats row */}
            <div className="mt-4 md:mt-6 flex items-center gap-4 md:gap-6 text-white/30 text-[10px] md:text-xs font-mono uppercase tracking-[0.2em]">
              <span>
                {completedPhases}/{totalPhases} Phases
              </span>
              <span style={{ color: "var(--recruiting-primary)" }}>/</span>
              <span>{totalPhases - completedPhases} Remaining</span>
            </div>
          </div>

          {/* Right: Massive progress number */}
          <div className="text-right">
            <div
              className="text-[18vw] md:text-[12vw] lg:text-[8vw] font-black leading-[0.7] tracking-tighter"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: "var(--recruiting-primary)",
              }}
            >
              {progressPercentage}
              <span className="text-[0.3em] text-white/30">%</span>
            </div>
            <span className="font-mono text-[10px] text-white/30 tracking-[0.3em] uppercase">
              Complete
            </span>
          </div>
        </div>

        {/* Photo upload - brutalist button */}
        <div className="mt-4 md:mt-6 flex justify-end">
          <label htmlFor="hero-photo-upload" className="cursor-pointer">
            <div
              className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 font-mono text-[9px] md:text-[10px] uppercase tracking-[0.2em] border-2 transition-all duration-150"
              style={{
                borderColor: "var(--recruiting-primary)",
                color: uploadingPhoto ? "var(--recruiting-primary)" : "white",
                background: uploadingPhoto
                  ? "transparent"
                  : "var(--recruiting-primary)",
              }}
            >
              {uploadingPhoto ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              {uploadingPhoto ? "Uploading..." : "Upload Photo"}
            </div>
          </label>
          <input
            id="hero-photo-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPhotoUpload}
            disabled={uploadingPhoto}
          />
        </div>
      </div>

      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: "var(--recruiting-primary)" }}
      />
    </section>
  );
}
