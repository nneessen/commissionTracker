// src/features/underwriting/components/UnderwritingSettingsTab.tsx

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  History,
  FileText,
  Settings,
  Loader2,
  ClipboardCheck,
  DollarSign,
  Shield,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCanManageUnderwriting } from "../hooks/useUnderwritingFeatureFlag";
import { useUnderwritingToggle } from "../hooks/useUnderwritingToggle";
import { SessionHistoryList } from "./SessionHistory/SessionHistoryList";
import { GuideList } from "./GuideManager";
import { CriteriaReviewDashboard } from "./CriteriaReview";
import { RateEntryTab } from "./RateEntry";
import { AcceptanceRulesTab } from "./AcceptanceRules";

export function UnderwritingSettingsTab() {
  const { canManage, isLoading } = useCanManageUnderwriting();
  const [activeTab, setActiveTab] = useState("criteria");

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-900 dark:border-zinc-100" />
        </div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="text-center text-zinc-500 dark:text-zinc-400 text-[11px]">
          You don't have permission to manage underwriting settings.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <h2 className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100">
          AI Underwriting Wizard
        </h2>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
          Manage carrier criteria, premium rates, acceptance rules, and view
          session history
        </p>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex items-center gap-0 bg-zinc-100/50 dark:bg-zinc-800/50 mx-3 mt-2 rounded-md p-0.5 h-auto w-fit">
          <TabsTrigger
            value="criteria"
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <ClipboardCheck className="h-3 w-3 shrink-0" />
            <span>Criteria</span>
          </TabsTrigger>
          <TabsTrigger
            value="rates"
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <DollarSign className="h-3 w-3 shrink-0" />
            <span>Rates</span>
          </TabsTrigger>
          <TabsTrigger
            value="acceptance"
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <Shield className="h-3 w-3 shrink-0" />
            <span>Acceptance</span>
          </TabsTrigger>
          <TabsTrigger
            value="guides"
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <FileText className="h-3 w-3 shrink-0" />
            <span>Guides</span>
          </TabsTrigger>
          <TabsTrigger
            value="sessions"
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <History className="h-3 w-3 shrink-0" />
            <span>History</span>
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <Settings className="h-3 w-3 shrink-0" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        <div className="p-3">
          <TabsContent value="criteria" className="mt-0">
            <CriteriaReviewDashboard />
          </TabsContent>

          <TabsContent value="rates" className="mt-0">
            <RateEntryTab />
          </TabsContent>

          <TabsContent value="acceptance" className="mt-0">
            <AcceptanceRulesTab />
          </TabsContent>

          <TabsContent value="guides" className="mt-0">
            <GuideList />
          </TabsContent>

          <TabsContent value="sessions" className="mt-0">
            <SessionHistoryList />
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <FeatureSettingsPanel />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function FeatureSettingsPanel() {
  const { isEnabled, isLoading, toggleEnabled } = useUnderwritingToggle();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 mb-3">
          Feature Settings
        </h3>

        <div className="space-y-4">
          {/* Underwriting Wizard Toggle */}
          <div className="flex items-start justify-between gap-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-md border border-zinc-200 dark:border-zinc-700">
            <div className="space-y-0.5">
              <Label
                htmlFor="wizard-toggle"
                className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                AI Underwriting Wizard
              </Label>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Enable the AI-powered underwriting wizard for your agency. When
                enabled, agents can access the wizard from the Policies page to
                get instant underwriting assessments and carrier
                recommendations.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isLoading && (
                <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
              )}
              <Switch
                id="wizard-toggle"
                checked={isEnabled}
                onCheckedChange={toggleEnabled}
                disabled={isLoading}
                className="data-[state=checked]:bg-green-600"
              />
            </div>
          </div>

          {/* Info Section */}
          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 space-y-2">
            <p>
              <strong className="text-zinc-700 dark:text-zinc-300">
                How it works:
              </strong>{" "}
              The wizard collects client health information and uses the
              recommendation engine to filter products by eligibility, score
              approval likelihood using carrier acceptance rules, and calculate
              premiums from your rate data.
            </p>
            <p>
              <strong className="text-zinc-700 dark:text-zinc-300">
                Requirements:
              </strong>{" "}
              For best results, enter premium rates in the Rates tab and
              configure carrier acceptance rules in the Acceptance tab. Upload
              carrier underwriting guides for AI-assisted criteria extraction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
