// src/features/admin/components/FeatureAssignmentMatrix.tsx
// Matrix for assigning features and analytics sections to subscription plans

import { useState, useMemo, useCallback } from "react";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  useUpdatePlanFeatures,
  useUpdatePlanAnalytics,
  type SubscriptionPlan,
  type SubscriptionFeatures,
} from "@/hooks/admin";
import {
  ANALYTICS_SECTIONS_REGISTRY,
  FEATURE_CATEGORIES,
  getFeaturesByCategory,
  type FeatureCategory,
} from "@/constants/features";

interface FeatureAssignmentMatrixProps {
  plans: SubscriptionPlan[];
}

export function FeatureAssignmentMatrix({
  plans,
}: FeatureAssignmentMatrixProps) {
  // Local state for pending changes
  const [pendingFeatureChanges, setPendingFeatureChanges] = useState<
    Record<string, SubscriptionFeatures>
  >({});
  const [pendingAnalyticsChanges, setPendingAnalyticsChanges] = useState<
    Record<string, string[]>
  >({});

  const updateFeatures = useUpdatePlanFeatures();
  const updateAnalytics = useUpdatePlanAnalytics();

  const featuresByCategory = useMemo(() => getFeaturesByCategory(), []);

  // Get current feature state (pending or original)
  const getFeatureState = useCallback(
    (planId: string, featureKey: string): boolean => {
      if (pendingFeatureChanges[planId]) {
        return (
          pendingFeatureChanges[planId][
            featureKey as keyof SubscriptionFeatures
          ] ?? false
        );
      }
      const plan = plans.find((p) => p.id === planId);
      return plan?.features[featureKey as keyof SubscriptionFeatures] ?? false;
    },
    [plans, pendingFeatureChanges],
  );

  // Get current analytics state (pending or original)
  const getAnalyticsState = useCallback(
    (planId: string, sectionKey: string): boolean => {
      if (pendingAnalyticsChanges[planId]) {
        return pendingAnalyticsChanges[planId].includes(sectionKey);
      }
      const plan = plans.find((p) => p.id === planId);
      return plan?.analytics_sections?.includes(sectionKey) ?? false;
    },
    [plans, pendingAnalyticsChanges],
  );

  // Toggle feature
  const toggleFeature = (planId: string, featureKey: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

    const currentFeatures = pendingFeatureChanges[planId] || {
      ...plan.features,
    };
    const newFeatures = {
      ...currentFeatures,
      [featureKey]: !currentFeatures[featureKey as keyof SubscriptionFeatures],
    };

    setPendingFeatureChanges((prev) => ({
      ...prev,
      [planId]: newFeatures,
    }));
  };

  // Toggle analytics section
  const toggleAnalytics = (planId: string, sectionKey: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

    const currentSections = pendingAnalyticsChanges[planId] || [
      ...(plan.analytics_sections || []),
    ];
    const newSections = currentSections.includes(sectionKey)
      ? currentSections.filter((s) => s !== sectionKey)
      : [...currentSections, sectionKey];

    setPendingAnalyticsChanges((prev) => ({
      ...prev,
      [planId]: newSections,
    }));
  };

  // Check if there are pending changes for a plan
  const hasPendingChanges = (planId: string): boolean => {
    return !!(pendingFeatureChanges[planId] || pendingAnalyticsChanges[planId]);
  };

  // Save changes for a plan
  const saveChanges = async (planId: string) => {
    const featureChanges = pendingFeatureChanges[planId];
    const analyticsChanges = pendingAnalyticsChanges[planId];

    if (featureChanges) {
      await updateFeatures.mutateAsync({
        planId,
        features: featureChanges,
      });
      setPendingFeatureChanges((prev) => {
        const { [planId]: _, ...rest } = prev;
        return rest;
      });
    }

    if (analyticsChanges) {
      await updateAnalytics.mutateAsync({
        planId,
        analyticsSections: analyticsChanges,
      });
      setPendingAnalyticsChanges((prev) => {
        const { [planId]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  // Reset changes for a plan
  const resetChanges = (planId: string) => {
    setPendingFeatureChanges((prev) => {
      const { [planId]: _, ...rest } = prev;
      return rest;
    });
    setPendingAnalyticsChanges((prev) => {
      const { [planId]: _, ...rest } = prev;
      return rest;
    });
  };

  // Save all changes
  const saveAllChanges = async () => {
    for (const planId of Object.keys(pendingFeatureChanges)) {
      await saveChanges(planId);
    }
    for (const planId of Object.keys(pendingAnalyticsChanges)) {
      if (!pendingFeatureChanges[planId]) {
        await saveChanges(planId);
      }
    }
  };

  const hasAnyPendingChanges =
    Object.keys(pendingFeatureChanges).length > 0 ||
    Object.keys(pendingAnalyticsChanges).length > 0;

  const isSaving = updateFeatures.isPending || updateAnalytics.isPending;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            Feature & Analytics Configuration
          </CardTitle>
          {hasAnyPendingChanges && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] text-amber-600">
                Unsaved changes
              </Badge>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  setPendingFeatureChanges({});
                  setPendingAnalyticsChanges({});
                }}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset All
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={saveAllChanges}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Save className="h-3 w-3 mr-1" />
                )}
                Save All
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="text-left py-2 pr-4 text-xs font-medium text-zinc-500 w-48">
                  Feature / Section
                </th>
                {plans.map((plan) => (
                  <th
                    key={plan.id}
                    className="text-center py-2 px-2 text-xs font-medium text-zinc-900 dark:text-zinc-100"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="uppercase tracking-wide">
                        {plan.display_name}
                      </span>
                      {hasPendingChanges(plan.id) && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0"
                            onClick={() => resetChanges(plan.id)}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0 text-emerald-600"
                            onClick={() => saveChanges(plan.id)}
                            disabled={isSaving}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Feature Categories */}
              {(
                Object.entries(featuresByCategory) as [
                  FeatureCategory,
                  (typeof featuresByCategory)[FeatureCategory],
                ][]
              ).map(([category, features]) => (
                <>
                  {features.length > 0 && (
                    <tr key={`category-${category}`}>
                      <td
                        colSpan={plans.length + 1}
                        className="pt-3 pb-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider"
                      >
                        {FEATURE_CATEGORIES[category].label}
                      </td>
                    </tr>
                  )}
                  {features.map((feature) => (
                    <tr
                      key={feature.key}
                      className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                    >
                      <td className="py-1.5 pr-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            {feature.displayName}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {feature.description}
                          </span>
                        </div>
                      </td>
                      {plans.map((plan) => {
                        const isEnabled = getFeatureState(plan.id, feature.key);
                        const isPending = pendingFeatureChanges[plan.id];
                        return (
                          <td key={plan.id} className="text-center py-1.5 px-2">
                            <Checkbox
                              checked={isEnabled}
                              onCheckedChange={() =>
                                toggleFeature(plan.id, feature.key)
                              }
                              className={`${
                                isPending
                                  ? "border-amber-500"
                                  : isEnabled
                                    ? "border-emerald-500 data-[state=checked]:bg-emerald-500"
                                    : ""
                              }`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}

              {/* Analytics Sections */}
              <tr>
                <td
                  colSpan={plans.length + 1}
                  className="pt-4 pb-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider border-t border-zinc-200 dark:border-zinc-800"
                >
                  Analytics Dashboard Sections
                </td>
              </tr>
              {Object.values(ANALYTICS_SECTIONS_REGISTRY).map((section) => (
                <tr
                  key={section.key}
                  className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <td className="py-1.5 pr-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        {section.displayName}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {section.description}
                      </span>
                    </div>
                  </td>
                  {plans.map((plan) => {
                    const isEnabled = getAnalyticsState(plan.id, section.key);
                    const isPending = pendingAnalyticsChanges[plan.id];
                    return (
                      <td key={plan.id} className="text-center py-1.5 px-2">
                        <Checkbox
                          checked={isEnabled}
                          onCheckedChange={() =>
                            toggleAnalytics(plan.id, section.key)
                          }
                          className={`${
                            isPending
                              ? "border-amber-500"
                              : isEnabled
                                ? "border-emerald-500 data-[state=checked]:bg-emerald-500"
                                : ""
                          }`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
