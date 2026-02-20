// src/features/billing/components/admin/AnnouncementFeaturesEditor.tsx
// Admin UI for selecting which features appear in the announcement dialog per plan

import { useState, useMemo, useCallback } from "react";
import {
  Loader2,
  Save,
  RotateCcw,
  ChevronDown,
  LayoutDashboard,
  Target,
  FileText,
  Users,
  MessageSquare,
  BarChart3,
  Palette,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  useUpdatePlanAnnouncementFeatures,
  type SubscriptionPlan,
  type SubscriptionFeatures,
} from "@/hooks/admin";
import {
  FEATURE_CATEGORIES,
  CATEGORY_ACCENT_COLORS,
  CATEGORY_BORDER_COLORS,
  getFeaturesByCategory,
  type FeatureCategory,
} from "@/constants/features";

const CATEGORY_ICONS_RESOLVED: Record<FeatureCategory, LucideIcon> = {
  core: LayoutDashboard,
  tracking: Target,
  reports: FileText,
  team: Users,
  messaging: MessageSquare,
  analytics: BarChart3,
  branding: Palette,
};

interface AnnouncementFeaturesEditorProps {
  plans: SubscriptionPlan[];
}

export function AnnouncementFeaturesEditor({
  plans,
}: AnnouncementFeaturesEditorProps) {
  const [pendingChanges, setPendingChanges] = useState<
    Record<string, string[]>
  >({});

  const allCategoryKeys = useMemo(
    () => Object.keys(FEATURE_CATEGORIES) as string[],
    [],
  );
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    () => new Set(allCategoryKeys),
  );

  const updateAnnouncementFeatures = useUpdatePlanAnnouncementFeatures();
  const featuresByCategory = useMemo(() => getFeaturesByCategory(), []);

  const getAnnouncementState = useCallback(
    (planId: string, featureKey: string): boolean => {
      if (pendingChanges[planId]) {
        return pendingChanges[planId].includes(featureKey);
      }
      const plan = plans.find((p) => p.id === planId);
      return plan?.announcement_features?.includes(featureKey) ?? false;
    },
    [plans, pendingChanges],
  );

  const isFeatureEnabled = useCallback(
    (planId: string, featureKey: string): boolean => {
      const plan = plans.find((p) => p.id === planId);
      return plan?.features[featureKey as keyof SubscriptionFeatures] ?? false;
    },
    [plans],
  );

  const toggleFeature = (planId: string, featureKey: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

    const current = pendingChanges[planId] || [
      ...(plan.announcement_features || []),
    ];
    const newFeatures = current.includes(featureKey)
      ? current.filter((k) => k !== featureKey)
      : [...current, featureKey];

    setPendingChanges((prev) => ({
      ...prev,
      [planId]: newFeatures,
    }));
  };

  const hasPendingChanges = (planId: string): boolean => {
    return !!pendingChanges[planId];
  };

  const saveChanges = async (planId: string) => {
    const changes = pendingChanges[planId];
    if (!changes) return;

    await updateAnnouncementFeatures.mutateAsync({
      planId,
      announcementFeatures: changes,
    });
    setPendingChanges((prev) => {
      const { [planId]: _, ...rest } = prev;
      return rest;
    });
  };

  const resetChanges = (planId: string) => {
    setPendingChanges((prev) => {
      const { [planId]: _, ...rest } = prev;
      return rest;
    });
  };

  const saveAllChanges = async () => {
    for (const planId of Object.keys(pendingChanges)) {
      await saveChanges(planId);
    }
  };

  const hasAnyPendingChanges = Object.keys(pendingChanges).length > 0;
  const isSaving = updateAnnouncementFeatures.isPending;

  const expandAll = () => setOpenCategories(new Set(allCategoryKeys));
  const collapseAll = () => setOpenCategories(new Set());

  const toggleCategory = (key: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const gridCols = `minmax(220px, 1fr) ${plans.map(() => "80px").join(" ")}`;

  const getAnnouncementCount = (planId: string): number => {
    if (pendingChanges[planId]) {
      return pendingChanges[planId].length;
    }
    const plan = plans.find((p) => p.id === planId);
    return plan?.announcement_features?.length ?? 0;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-sm font-semibold">
              Announcement Dialog Features
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10px] text-zinc-500 px-2"
                onClick={expandAll}
              >
                Expand All
              </Button>
              <span className="text-zinc-300 dark:text-zinc-700 text-[10px]">
                /
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10px] text-zinc-500 px-2"
                onClick={collapseAll}
              >
                Collapse All
              </Button>
            </div>
          </div>
          {hasAnyPendingChanges && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] text-amber-600">
                Unsaved changes
              </Badge>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setPendingChanges({})}
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
        <p className="text-[10px] text-zinc-500 mt-1">
          Select which features to highlight for each plan in the subscription
          announcement dialog. Only features enabled for a plan can be selected.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          {/* Column Headers */}
          <div
            className="grid items-end border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-1"
            style={{ gridTemplateColumns: gridCols }}
          >
            <div className="text-xs font-medium text-zinc-500 pr-4">
              Feature
            </div>
            {plans.map((plan) => (
              <div key={plan.id} className="text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                    {plan.display_name}
                  </span>
                  <span className="text-[9px] text-zinc-400 tabular-nums">
                    {getAnnouncementCount(plan.id)} selected
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
              </div>
            ))}
          </div>

          {/* Feature Categories */}
          <div className="space-y-1">
            {(
              Object.entries(featuresByCategory) as [
                FeatureCategory,
                (typeof featuresByCategory)[FeatureCategory],
              ][]
            )
              .filter(([, features]) => features.length > 0)
              .map(([category, features]) => {
                const CategoryIcon = CATEGORY_ICONS_RESOLVED[category];
                const accentColor = CATEGORY_ACCENT_COLORS[category];
                const borderColor = CATEGORY_BORDER_COLORS[category];
                const isOpen = openCategories.has(category);

                return (
                  <Collapsible
                    key={category}
                    open={isOpen}
                    onOpenChange={() => toggleCategory(category)}
                  >
                    {/* Category Header Row */}
                    <div
                      className="grid items-center rounded-md bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      style={{ gridTemplateColumns: gridCols }}
                    >
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center gap-2 py-2 px-2 text-left w-full group">
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${accentColor}`}
                          />
                          <CategoryIcon className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                              {FEATURE_CATEGORIES[category].label}
                            </span>
                          </div>
                          <ChevronDown
                            className={`h-3.5 w-3.5 text-zinc-400 shrink-0 transition-transform ${
                              isOpen ? "" : "-rotate-90"
                            }`}
                          />
                        </button>
                      </CollapsibleTrigger>
                      {/* Spacer columns for alignment */}
                      {plans.map((plan) => (
                        <div key={plan.id} className="py-2" />
                      ))}
                    </div>

                    {/* Feature Rows */}
                    <CollapsibleContent>
                      {features.map((feature, idx) => (
                        <div
                          key={feature.key}
                          className={`grid items-center border-l-2 ${borderColor} ml-2 pl-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 ${
                            idx % 2 === 0
                              ? "bg-white dark:bg-transparent"
                              : "bg-zinc-50/50 dark:bg-zinc-900/20"
                          }`}
                          style={{ gridTemplateColumns: gridCols }}
                        >
                          <div className="py-1.5 pr-4">
                            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                              {feature.displayName}
                            </span>
                          </div>
                          {plans.map((plan) => {
                            const featureEnabled = isFeatureEnabled(
                              plan.id,
                              feature.key,
                            );
                            const isSelected = getAnnouncementState(
                              plan.id,
                              feature.key,
                            );
                            const isPending = pendingChanges[plan.id];

                            return (
                              <div
                                key={plan.id}
                                className="flex justify-center py-1.5"
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() =>
                                    toggleFeature(plan.id, feature.key)
                                  }
                                  disabled={!featureEnabled}
                                  className={`${
                                    !featureEnabled
                                      ? "opacity-30 cursor-not-allowed"
                                      : isPending
                                        ? "border-amber-500"
                                        : isSelected
                                          ? "border-emerald-500 data-[state=checked]:bg-emerald-500"
                                          : ""
                                  }`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
