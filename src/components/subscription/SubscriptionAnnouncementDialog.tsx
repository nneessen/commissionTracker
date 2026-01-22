// src/components/subscription/SubscriptionAnnouncementDialog.tsx

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Check,
  Users,
  Target,
  Link2,
  MessageSquare,
  Mail,
  BarChart3,
  Workflow,
  Crown,
  Zap,
  TrendingUp,
  Instagram,
  UserPlus,
  Building2,
  LayoutDashboard,
  FileText,
  Calculator,
  Settings,
  DollarSign,
  PieChart,
  FileDown,
  MessageCircle,
  Network,
} from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface SubscriptionAnnouncementDialogProps {
  open: boolean;
  onDismiss: () => void;
}

export function SubscriptionAnnouncementDialog({
  open,
  onDismiss,
}: SubscriptionAnnouncementDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDismiss()}>
      <DialogContent
        size="full"
        hideCloseButton
        className="p-0 overflow-hidden bg-background border-0"
      >
        <VisuallyHidden>
          <DialogTitle>Subscription Tiers Announcement</DialogTitle>
          <DialogDescription>
            Information about upcoming subscription tiers launching February 1,
            2026
          </DialogDescription>
        </VisuallyHidden>

        <div className="h-[90vh] flex flex-col lg:flex-row">
          {/* Left Panel - Dark Hero (hidden on mobile) */}
          <div className="lg:w-[45%] bg-foreground relative hidden lg:flex flex-col overflow-hidden">
            {/* Animated grid background */}
            <div className="absolute inset-0 opacity-[0.04]">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern
                    id="announcement-grid"
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
                <rect
                  width="100%"
                  height="100%"
                  fill="url(#announcement-grid)"
                />
              </svg>
            </div>

            {/* Animated glow orbs */}
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
            <div
              className="absolute bottom-1/3 -right-20 w-80 h-80 bg-amber-400/5 rounded-full blur-3xl animate-pulse"
              style={{ animationDelay: "1s" }}
            />
            <div
              className="absolute top-2/3 left-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl animate-pulse"
              style={{ animationDelay: "2s" }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col justify-between p-8 xl:p-10 h-full">
              {/* Logo and brand */}
              <div className="flex items-center gap-4 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-500/20 rounded-xl blur-xl group-hover:bg-amber-500/30 transition-all duration-500" />
                  <img
                    src="/logos/Light Letter Logo .png"
                    alt="The Standard"
                    className="relative h-12 w-12 drop-shadow-2xl dark:hidden"
                  />
                  <img
                    src="/logos/LetterLogo.png"
                    alt="The Standard"
                    className="relative h-12 w-12 drop-shadow-2xl hidden dark:block"
                  />
                </div>
                <div className="flex flex-col">
                  <span
                    className="text-white dark:text-black text-xl font-bold tracking-wide"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    THE STANDARD
                  </span>
                  <span className="text-amber-400 text-[9px] uppercase tracking-[0.3em] font-medium">
                    Financial Group
                  </span>
                </div>
              </div>

              {/* Main messaging */}
              <div className="space-y-6 flex-1 flex flex-col justify-center">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 rounded-full px-3 py-1.5 w-fit">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-amber-400 text-xs font-medium">
                    New in 2026
                  </span>
                </div>

                <div>
                  <h1
                    className="text-3xl xl:text-4xl font-bold leading-tight mb-3"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    <span className="text-white dark:text-black">
                      Full Access
                    </span>
                    <br />
                    <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 bg-clip-text text-transparent">
                      Through February
                    </span>
                  </h1>
                  <p className="text-white/80 dark:text-black/70 text-sm max-w-sm leading-relaxed">
                    Enjoy complete access to all features* this month. Starting
                    February 28, 2026, subscription tiers will be enabled with
                    flexible plans for every stage of your business.
                  </p>
                  <p className="text-white/50 dark:text-black/40 text-[10px] mt-2">
                    *Recruiting Pipeline features available with Team tier
                  </p>
                </div>

                {/* Countdown-style info */}
                <div className="bg-white/5 dark:bg-black/10 border border-white/10 dark:border-black/10 rounded-lg p-4 max-w-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/20">
                      <Crown className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-white dark:text-black font-semibold text-sm">
                        Subscription Tiers Launch
                      </p>
                      <p className="text-white/60 dark:text-black/60 text-xs">
                        March 1, 2026
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom */}
              <div className="text-white/50 dark:text-black/50 text-xs">
                &copy; {new Date().getFullYear()} The Standard Financial Group
              </div>
            </div>
          </div>

          {/* Right Panel - Content */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-background">
            {/* Mobile Header */}
            <div className="lg:hidden p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src="/logos/LetterLogo.png"
                    alt="The Standard"
                    className="h-8 w-8 dark:hidden"
                  />
                  <img
                    src="/logos/Light Letter Logo .png"
                    alt="The Standard"
                    className="h-8 w-8 hidden dark:block"
                  />
                  <span
                    className="text-foreground font-bold"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    THE STANDARD
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-500/20 rounded-full px-2 py-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span className="text-amber-600 dark:text-amber-400 text-[10px] font-medium">
                    New in 2026
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 lg:p-6 xl:p-8">
              {/* Header Section */}
              <div className="mb-6">
                <h2
                  className="text-xl lg:text-2xl font-bold text-foreground mb-1"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Choose Your Plan
                </h2>
                <p className="text-muted-foreground text-sm">
                  Starting March 1, 2026 • Pricing coming soon
                </p>
              </div>

              {/* Tier Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                {/* Free Tier */}
                <TierCard
                  name="Free"
                  description="Essential tools to get started"
                  price="$0"
                  priceNote="forever"
                  features={[
                    { icon: LayoutDashboard, label: "Dashboard" },
                    { icon: FileText, label: "Policy Management" },
                    { icon: Calculator, label: "Compensation Guide" },
                    { icon: Settings, label: "Settings" },
                    { icon: UserPlus, label: "Connect Upline" },
                  ]}
                />

                {/* Pro Tier */}
                <TierCard
                  name="Pro"
                  description="Advanced tools for producers"
                  price="Coming Soon"
                  priceNote="monthly/annual"
                  highlighted
                  features={[
                    {
                      icon: Check,
                      label: "Everything in Free",
                      isIncluded: true,
                    },
                    { icon: DollarSign, label: "Expense Tracking" },
                    { icon: Target, label: "Full Targets & Goals" },
                    { icon: PieChart, label: "Advanced Analytics" },
                    { icon: FileDown, label: "Reports Export" },
                    { icon: Mail, label: "Email Messaging" },
                  ]}
                />

                {/* Team Tier */}
                <TierCard
                  name="Team"
                  description="Complete suite for builders"
                  price="Coming Soon"
                  priceNote="monthly/annual"
                  badge="Most Popular"
                  features={[
                    {
                      icon: Check,
                      label: "Everything in Pro",
                      isIncluded: true,
                    },
                    { icon: MessageCircle, label: "SMS Messaging" },
                    { icon: Network, label: "Team Hierarchy" },
                    {
                      icon: Users,
                      label: "Recruiting Pipeline",
                      isHighlighted: true,
                    },
                    { icon: TrendingUp, label: "Override Tracking" },
                    { icon: Instagram, label: "Instagram Messaging" },
                    { icon: Workflow, label: "Workflows & Automations" },
                  ]}
                />
              </div>

              {/* Recruiting Value Proposition */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 lg:p-5 mb-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
                    <Users className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-base lg:text-lg font-bold text-foreground mb-1"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      Supercharge Your Recruiting
                    </h3>
                    <p className="text-muted-foreground text-xs lg:text-sm mb-3">
                      The Team tier unlocks powerful tools designed for agency
                      builders looking to scale their business.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <RecruitingFeature
                        icon={Zap}
                        label="Streamlined agent pipeline"
                      />
                      <RecruitingFeature
                        icon={Link2}
                        label="Customizable lead funnels"
                      />
                      <RecruitingFeature
                        icon={Building2}
                        label="Personal agency pipelines"
                      />
                      <RecruitingFeature
                        icon={MessageSquare}
                        label="LinkedIn & Instagram integration"
                      />
                      <RecruitingFeature
                        icon={Workflow}
                        label="Automated workflows"
                      />
                      <RecruitingFeature
                        icon={Mail}
                        label="Built-in email outreach"
                      />
                      <RecruitingFeature
                        icon={Users}
                        label="Team management at scale"
                      />
                      <RecruitingFeature
                        icon={BarChart3}
                        label="Hundreds of KPI metrics"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dismiss Button */}
              <div className="flex justify-center lg:justify-end">
                <Button
                  onClick={onDismiss}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 px-8"
                >
                  Got it
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Sub-components

interface TierFeature {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isIncluded?: boolean;
  isHighlighted?: boolean;
}

interface TierCardProps {
  name: string;
  description: string;
  price: string;
  priceNote: string;
  features: TierFeature[];
  highlighted?: boolean;
  badge?: string;
}

function TierCard({
  name,
  description,
  price,
  priceNote,
  features,
  highlighted,
  badge,
}: TierCardProps) {
  return (
    <div
      className={`relative rounded-xl border p-4 ${
        highlighted
          ? "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20"
          : badge
            ? "border-foreground/20 bg-foreground/5 dark:bg-foreground/5"
            : "border-border bg-card"
      }`}
    >
      {badge && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 bg-foreground text-background text-[10px] font-medium px-2 py-0.5 rounded-full">
            <Crown className="h-3 w-3" />
            {badge}
          </span>
        </div>
      )}

      <div className="mb-3">
        <h3
          className="font-bold text-foreground"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {name}
        </h3>
        <p className="text-muted-foreground text-[11px]">{description}</p>
      </div>

      <div className="mb-3">
        <span
          className={`text-lg font-bold ${
            price === "Coming Soon"
              ? "text-muted-foreground"
              : "text-foreground"
          }`}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {price}
        </span>
        <span className="text-muted-foreground text-[10px] ml-1">
          {priceNote}
        </span>
      </div>

      <div className="space-y-1.5">
        {features.map((feature, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 text-xs ${
              feature.isHighlighted
                ? "text-amber-600 dark:text-amber-400 font-medium"
                : feature.isIncluded
                  ? "text-muted-foreground"
                  : "text-foreground"
            }`}
          >
            <feature.icon
              className={`h-3.5 w-3.5 flex-shrink-0 ${
                feature.isHighlighted
                  ? "text-amber-500"
                  : feature.isIncluded
                    ? "text-muted-foreground"
                    : "text-muted-foreground"
              }`}
            />
            <span>{feature.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface RecruitingFeatureProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

function RecruitingFeature({ icon: Icon, label }: RecruitingFeatureProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center w-5 h-5 rounded bg-amber-500/20">
        <Icon className="h-3 w-3 text-amber-600 dark:text-amber-400" />
      </div>
      <span className="text-foreground text-xs">{label}</span>
    </div>
  );
}
