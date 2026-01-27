// src/features/admin/components/SubscriptionPlansTab.tsx
// Admin tab for managing subscription plans and add-ons

import { useState } from "react";
import {
  CreditCard,
  Settings,
  Package,
  Check,
  Loader2,
  Edit2,
  Plus,
  Users,
  Mail,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAdminSubscriptionPlans,
  useAdminSubscriptionAddons,
  type SubscriptionPlan,
} from "@/hooks/admin";
import { PlanEditorDialog } from "./PlanEditorDialog";
import { FeatureAssignmentMatrix } from "./FeatureAssignmentMatrix";
import { AddonsManagementPanel } from "./AddonsManagementPanel";
import { CreatePlanDialog } from "./CreatePlanDialog";
import { cn } from "@/lib/utils";

export function SubscriptionPlansTab() {
  const { data: plans, isLoading: plansLoading } = useAdminSubscriptionPlans();
  const { data: addons, isLoading: addonsLoading } =
    useAdminSubscriptionAddons();

  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Free";
    return `$${(cents / 100).toFixed(0)}`;
  };

  // Sort plans: active first, then by sort_order
  const sortedPlans = plans
    ? [...plans].sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return a.sort_order - b.sort_order;
      })
    : [];

  const activePlans = sortedPlans.filter((p) => p.is_active);
  const inactivePlans = sortedPlans.filter((p) => !p.is_active);

  if (plansLoading || addonsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-zinc-500" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Subscription Plans
          </h2>
          <Badge variant="outline" className="text-[10px]">
            {activePlans.length} active
          </Badge>
          {inactivePlans.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {inactivePlans.length} inactive
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Plan
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="overview" className="h-full flex flex-col">
          <TabsList className="w-fit mb-3">
            <TabsTrigger value="overview" className="text-xs">
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Plans Overview
            </TabsTrigger>
            <TabsTrigger value="features" className="text-xs">
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Feature Matrix
            </TabsTrigger>
            <TabsTrigger value="addons" className="text-xs">
              <Package className="h-3.5 w-3.5 mr-1.5" />
              Add-ons
            </TabsTrigger>
          </TabsList>

          {/* Plans Overview - Table-based design */}
          <TabsContent value="overview" className="flex-1 space-y-4 mt-0">
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50 dark:bg-zinc-800/50">
                    <TableHead className="text-[11px] font-semibold w-8">
                      #
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold">
                      Plan
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold text-center">
                      Status
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold text-right">
                      Monthly
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold text-right">
                      Annual
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold text-center">
                      <Mail className="h-3 w-3 inline mr-1" />
                      Emails
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold text-center">
                      <Users className="h-3 w-3 inline mr-1" />
                      Team Limit
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold text-center">
                      <BarChart3 className="h-3 w-3 inline mr-1" />
                      Features
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPlans.map((plan) => {
                    const featureCount = Object.values(plan.features).filter(
                      Boolean,
                    ).length;
                    const analyticsCount = plan.analytics_sections?.length || 0;

                    return (
                      <TableRow
                        key={plan.id}
                        className={cn(
                          "group",
                          !plan.is_active &&
                            "opacity-50 bg-zinc-50 dark:bg-zinc-900",
                        )}
                      >
                        <TableCell className="text-[11px] text-zinc-400 font-mono">
                          {plan.sort_order}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {plan.display_name}
                              </div>
                              <div className="text-[10px] text-zinc-500 font-mono">
                                {plan.name}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {plan.is_active ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-semibold">
                            {formatPrice(plan.price_monthly)}
                          </span>
                          {plan.price_monthly > 0 && (
                            <span className="text-[10px] text-zinc-500">
                              /mo
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm">
                            {formatPrice(plan.price_annual)}
                          </span>
                          {plan.price_annual > 0 && plan.price_monthly > 0 && (
                            <span className="text-[10px] text-emerald-600 ml-1">
                              (
                              {Math.round(
                                (1 -
                                  plan.price_annual /
                                    (plan.price_monthly * 12)) *
                                  100,
                              )}
                              % off)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-xs">
                            {plan.email_limit === 0
                              ? "—"
                              : plan.email_limit === -1
                                ? "∞"
                                : plan.email_limit.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-xs">
                            {plan.team_size_limit === null
                              ? "∞"
                              : plan.team_size_limit === 0
                                ? "—"
                                : plan.team_size_limit}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-xs font-medium">
                              {featureCount}
                            </span>
                            <span className="text-[10px] text-zinc-400">/</span>
                            <span className="text-xs text-zinc-500">
                              {analyticsCount}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setEditingPlan(plan);
                              setIsEditorOpen(true);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">
                  Active Plans
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {activePlans.length}
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">
                  Total Features
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {Object.keys(activePlans[0]?.features || {}).length}
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">
                  Add-ons Available
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {addons?.filter((a) => a.is_active).length || 0}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Feature Matrix Tab */}
          <TabsContent value="features" className="flex-1 mt-0">
            {activePlans.length > 0 && (
              <FeatureAssignmentMatrix plans={activePlans} />
            )}
          </TabsContent>

          {/* Add-ons Tab */}
          <TabsContent value="addons" className="flex-1 mt-0">
            <AddonsManagementPanel addons={addons || []} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Plan Editor Dialog */}
      <PlanEditorDialog
        plan={editingPlan}
        open={isEditorOpen}
        onOpenChange={(open) => {
          setIsEditorOpen(open);
          if (!open) setEditingPlan(null);
        }}
      />

      {/* Create Plan Dialog */}
      <CreatePlanDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        existingPlans={plans || []}
      />
    </div>
  );
}
