// src/features/recruiting/components/public/LeadSubmissionConfirmation.tsx
// Confirmation page shown after successful lead submission

import { useState } from "react";
import { CheckCircle2, Calendar, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicRecruiterInfo } from "@/types/leads.types";

interface LeadSubmissionConfirmationProps {
  leadId: string;
  recruiterInfo: PublicRecruiterInfo;
}

export function LeadSubmissionConfirmation({
  leadId,
  recruiterInfo,
}: LeadSubmissionConfirmationProps) {
  const [showCalendly, setShowCalendly] = useState(false);

  // Check if recruiter has Calendly URL configured
  const hasCalendly = !!recruiterInfo.calendly_url;

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
      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Thank You for Your Interest!
          </h2>
          <p className="text-[14px] text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
            Your information has been received. A member of our team will reach
            out to you within 24-48 hours to discuss the next steps.
          </p>
        </div>

        {/* What Happens Next */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            What Happens Next?
          </h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  1
                </span>
              </div>
              <div>
                <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                  Review Your Application
                </p>
                <p className="text-[12px] text-zinc-500">
                  Our team will review your submission and qualifications.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  2
                </span>
              </div>
              <div>
                <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                  Discovery Call
                </p>
                <p className="text-[12px] text-zinc-500">
                  We&apos;ll schedule a call to learn more about your goals and
                  answer any questions.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  3
                </span>
              </div>
              <div>
                <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                  Start Your Journey
                </p>
                <p className="text-[12px] text-zinc-500">
                  If it&apos;s a good fit, we&apos;ll get you started on our
                  onboarding process.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Call CTA */}
        {hasCalendly && !showCalendly && (
          <div className="bg-zinc-900 dark:bg-zinc-800 rounded-lg p-6 text-center">
            <Calendar className="h-8 w-8 text-white mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Want to Speed Things Up?
            </h3>
            <p className="text-[13px] text-zinc-300 mb-4">
              Skip the wait and schedule your discovery call right now.
            </p>
            <Button
              onClick={() => setShowCalendly(true)}
              className="bg-white text-zinc-900 hover:bg-zinc-100"
            >
              Schedule a Call
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Calendly Embed */}
        {hasCalendly && showCalendly && recruiterInfo.calendly_url && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Schedule Your Discovery Call
              </h3>
              <p className="text-[12px] text-zinc-500">
                Select a time that works best for you.
              </p>
            </div>
            <div className="aspect-[4/3]">
              <iframe
                src={`${recruiterInfo.calendly_url}?hide_gdpr_banner=1&hide_event_type_details=1`}
                width="100%"
                height="100%"
                frameBorder="0"
                title="Schedule a call"
              />
            </div>
          </div>
        )}

        {/* Reference Number */}
        <p className="text-[10px] text-zinc-400 text-center mt-6">
          Reference: {leadId.slice(0, 8).toUpperCase()}
        </p>
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
