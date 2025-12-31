// src/features/recruiting/pages/PublicJoinPage.tsx
// Public landing page for recruiting funnel - v2

import { useState, useMemo } from "react";
import { useParams, useLocation } from "@tanstack/react-router";
import { Loader2, AlertCircle, Building2 } from "lucide-react";
import { usePublicRecruiterInfo } from "../hooks/useLeads";
import { LeadInterestForm } from "../components/public/LeadInterestForm";
import { LeadSubmissionConfirmation } from "../components/public/LeadSubmissionConfirmation";

/**
 * Extract recruiter slug from pathname or route params
 */
function extractSlug(
  pathname: string,
  params: { recruiterId?: string },
): string | null {
  // First check route params (for /join/$recruiterId route)
  if (params.recruiterId) {
    return params.recruiterId;
  }

  // Otherwise extract from pathname (for /join-slug pattern)
  const hyphenMatch = pathname.match(/^\/join-([^/]+)$/);
  if (hyphenMatch) {
    return hyphenMatch[1];
  }

  return null;
}

export function PublicJoinPage() {
  const location = useLocation();
  const params = useParams({ strict: false }) as { recruiterId?: string };

  // Extract slug from route params or pathname
  const recruiterId = useMemo(() => {
    const slug = extractSlug(location.pathname, params);
    console.log(
      "[PublicJoinPage] pathname:",
      location.pathname,
      "params:",
      params,
      "-> slug:",
      slug,
    );
    return slug;
  }, [location.pathname, params]);

  const [submittedLeadId, setSubmittedLeadId] = useState<string | null>(null);

  const {
    data: recruiterInfo,
    isLoading,
    error,
    status,
    fetchStatus,
  } = usePublicRecruiterInfo(recruiterId || "");

  // Debug logging
  console.log("[PublicJoinPage] Query state:", {
    recruiterId,
    isLoading,
    status,
    fetchStatus,
    hasData: !!recruiterInfo,
    error: error?.message,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400 mx-auto" />
          <p className="text-[11px] text-zinc-500 mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  // Error or not found state
  if (error || !recruiterInfo || !recruiterInfo.is_active) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Link Not Found
          </h1>
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
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

  // Main landing page with form
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {recruiterInfo.imo_logo_url ? (
              <img
                src={recruiterInfo.imo_logo_url}
                alt={recruiterInfo.imo_name || "Company"}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-zinc-400" />
              </div>
            )}
            <div>
              <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {recruiterInfo.imo_name || "Join Our Team"}
              </h1>
              <p className="text-[10px] text-zinc-500">Career Opportunity</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left Column - Hero Content */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
                Start Your Career in Insurance
              </h2>
              <p className="text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {recruiterInfo.imo_description ||
                  "Join a team of dedicated professionals helping families protect what matters most. Whether you're new to insurance or an experienced agent, we provide the training, support, and resources you need to succeed."}
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                What We Offer
              </h3>
              <ul className="space-y-2">
                {[
                  "Comprehensive training program",
                  "Competitive commission structure",
                  "Flexible schedule",
                  "Unlimited income potential",
                  "Ongoing mentorship and support",
                ].map((benefit, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-[12px] text-zinc-600 dark:text-zinc-400"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            {/* Social Proof */}
            <div className="bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-4">
              <p className="text-[12px] text-zinc-600 dark:text-zinc-400 italic">
                &quot;I started with no experience and within my first year, I
                was able to replace my previous income. The training and support
                made all the difference.&quot;
              </p>
              <p className="text-[11px] text-zinc-500 mt-2">
                — Recent Team Member
              </p>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Express Your Interest
                </h3>
                <p className="text-[12px] text-zinc-500 mt-1">
                  Fill out the form below and we&apos;ll be in touch within
                  24-48 hours.
                </p>
              </div>

              <LeadInterestForm
                recruiterSlug={recruiterId || ""}
                onSuccess={(leadId) => setSubmittedLeadId(leadId)}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <p className="text-[10px] text-zinc-400 text-center">
            &copy; {new Date().getFullYear()}{" "}
            {recruiterInfo.imo_name || "Company"}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default PublicJoinPage;
