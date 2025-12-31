// src/features/recruiting/pages/PublicJoinPage.tsx
// Public landing page for recruiting funnel - Visual redesign v4

import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "@tanstack/react-router";
import {
  Loader2,
  AlertCircle,
  DollarSign,
  BookOpen,
  Clock,
  Rocket,
  Users,
  MapPin,
  Zap,
} from "lucide-react";
import { leadsService } from "@/services/leads";
import type { PublicRecruiterInfo } from "@/types/leads.types";
import { LeadInterestForm } from "../components/public/LeadInterestForm";
import { LeadSubmissionConfirmation } from "../components/public/LeadSubmissionConfirmation";

/**
 * Extract recruiter slug from pathname or route params
 */
function extractSlug(
  pathname: string,
  params: { recruiterId?: string },
): string | null {
  if (params.recruiterId) {
    return params.recruiterId;
  }
  const hyphenMatch = pathname.match(/^\/join-([^/]+)$/);
  if (hyphenMatch) {
    return hyphenMatch[1];
  }
  return null;
}

export function PublicJoinPage() {
  const location = useLocation();
  const params = useParams({ strict: false }) as { recruiterId?: string };

  const recruiterId = useMemo(() => {
    const slug = extractSlug(location.pathname, params);
    return slug;
  }, [location.pathname, params]);

  const [submittedLeadId, setSubmittedLeadId] = useState<string | null>(null);
  const [recruiterInfo, setRecruiterInfo] =
    useState<PublicRecruiterInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!recruiterId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchRecruiter() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await leadsService.getPublicRecruiterInfo(recruiterId!);
        if (!cancelled) {
          setRecruiterInfo(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Failed to fetch"));
          setIsLoading(false);
        }
      }
    }

    fetchRecruiter();
    return () => {
      cancelled = true;
    };
  }, [recruiterId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  // Error or not found state
  if (error || !recruiterInfo || !recruiterInfo.is_active) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-lg border border-border p-6 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-foreground mb-2">
            Link Not Found
          </h1>
          <p className="text-sm text-muted-foreground">
            This recruiting link is no longer active or doesn&apos;t exist.
            Please contact your recruiter for a valid link.
          </p>
        </div>
      </div>
    );
  }

  // Show confirmation after successful submission
  if (submittedLeadId) {
    return (
      <LeadSubmissionConfirmation
        leadId={submittedLeadId}
        recruiterInfo={recruiterInfo}
      />
    );
  }

  // Main landing page with split-panel layout
  return (
    <div className="h-screen flex flex-col lg:flex-row bg-background overflow-hidden">
      {/* Left Panel - Dark Hero */}
      <div className="lg:w-1/2 xl:w-[50%] bg-foreground relative hidden lg:block overflow-hidden">
        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-[0.04]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="white"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Animated glow orbs */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-400/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-8 xl:p-10 h-full">
          {/* Logo and brand - Enhanced */}
          <div className="flex items-center gap-4 group">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/20 rounded-xl blur-xl group-hover:bg-amber-500/30 transition-all duration-500" />
              <img
                src="/logos/LetterLogo.png"
                alt="The Standard"
                className="relative h-14 w-14 invert dark:invert-0 drop-shadow-2xl"
              />
            </div>
            <div className="flex flex-col">
              <span
                className="text-white dark:text-black text-2xl font-bold tracking-wide"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                THE STANDARD
              </span>
              <span className="text-amber-400 text-[10px] uppercase tracking-[0.3em] font-medium">
                Financial Group
              </span>
            </div>
          </div>

          {/* Middle - Main messaging */}
          <div className="space-y-4">
            <div>
              <h1
                className="text-4xl xl:text-5xl font-bold leading-tight mb-3"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <span className="text-white dark:text-black">Join </span>
                <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 bg-clip-text text-transparent">
                  The Standard
                </span>
              </h1>
              <p className="text-white/80 dark:text-black/70 text-sm max-w-sm leading-relaxed">
                Ready to take control of your future? We&apos;re building
                something different—a tech-forward insurance agency where
                ambition meets opportunity.
              </p>
            </div>

            {/* Mission Statement */}
            <div className="bg-white/5 dark:bg-black/10 border border-white/10 dark:border-black/10 rounded-lg p-3 max-w-sm">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[10px] text-white/60 dark:text-black/60 uppercase tracking-wider">
                  Saint Petersburg, FL
                </span>
              </div>
              <p className="text-xs text-white/90 dark:text-black/80 leading-relaxed">
                Founded by{" "}
                <span className="text-white dark:text-black font-medium">
                  Nick Neessen
                </span>
                —20 years in sales, full-stack developer, and agency owner. We
                leverage the latest technology to help agents build real
                businesses, not just jobs.
              </p>
            </div>

            {/* Stats highlight */}
            <div className="relative bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-400/30 rounded-lg p-4 max-w-sm overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl" />
              <p
                className="relative text-3xl font-bold bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                $20,000+
              </p>
              <p className="relative text-white/80 dark:text-black/70 text-xs mt-1">
                Average monthly commissions for our agents
              </p>
            </div>

            {/* Feature highlights - 2 columns */}
            <div className="grid grid-cols-2 gap-2 max-w-sm">
              <div className="flex items-center gap-2 text-white/90 dark:text-black/80">
                <div className="flex items-center justify-center w-7 h-7 rounded bg-white/10 dark:bg-black/10">
                  <DollarSign className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs">Uncapped earnings</span>
              </div>
              <div className="flex items-center gap-2 text-white/90 dark:text-black/80">
                <div className="flex items-center justify-center w-7 h-7 rounded bg-white/10 dark:bg-black/10">
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs">Latest tech</span>
              </div>
              <div className="flex items-center gap-2 text-white/90 dark:text-black/80">
                <div className="flex items-center justify-center w-7 h-7 rounded bg-white/10 dark:bg-black/10">
                  <BookOpen className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs">Full training</span>
              </div>
              <div className="flex items-center gap-2 text-white/90 dark:text-black/80">
                <div className="flex items-center justify-center w-7 h-7 rounded bg-white/10 dark:bg-black/10">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs">Flexible schedule</span>
              </div>
              <div className="flex items-center gap-2 text-white/90 dark:text-black/80">
                <div className="flex items-center justify-center w-7 h-7 rounded bg-white/10 dark:bg-black/10">
                  <Rocket className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs">Build a business</span>
              </div>
              <div className="flex items-center gap-2 text-white/90 dark:text-black/80">
                <div className="flex items-center justify-center w-7 h-7 rounded bg-white/10 dark:bg-black/10">
                  <Users className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs">Mentorship</span>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="text-white/50 dark:text-black/50 text-xs">
            &copy; {new Date().getFullYear()} The Standard Financial Group
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-6 overflow-y-auto">
        <div className="w-full max-w-[420px]">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-4">
            <div className="flex items-center gap-3">
              <img
                src="/logos/LetterLogo.png"
                alt="The Standard"
                className="h-10 w-10"
              />
              <div className="flex flex-col">
                <span
                  className="text-foreground text-xl font-bold tracking-wide"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  THE STANDARD
                </span>
                <span className="text-amber-500 text-[9px] uppercase tracking-[0.25em] font-medium">
                  Financial Group
                </span>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="mb-3 text-center lg:text-left">
            <h2
              className="text-lg font-bold text-foreground mb-1"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Express Your Interest
            </h2>
            <p className="text-xs text-muted-foreground">
              Fill out the form below and we&apos;ll be in touch within 24-48
              hours.
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/50 shadow-xl p-4">
            <LeadInterestForm
              recruiterSlug={recruiterId || ""}
              onSuccess={(leadId) => setSubmittedLeadId(leadId)}
            />
          </div>

          {/* Footer */}
          <p className="mt-3 text-center text-[10px] text-muted-foreground">
            By submitting, you agree to be contacted about career opportunities.
          </p>

          {/* Mobile footer */}
          <p className="lg:hidden mt-4 text-center text-[10px] text-muted-foreground">
            &copy; {new Date().getFullYear()} The Standard Financial Group
          </p>
        </div>
      </div>
    </div>
  );
}

export default PublicJoinPage;
