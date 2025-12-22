/**
 * Alert Rule Dialog
 *
 * Dialog for creating and editing alert rules.
 * Compact zinc styling.
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  useAlertableMetrics,
  useCreateAlertRule,
  useUpdateAlertRule,
} from "@/hooks/alerts";
import {
  alertRuleFormSchema,
  COMPARISON_LABELS,
  type AlertRule,
  type AlertRuleFormSchema,
  type AlertComparison,
} from "@/types/alert-rules.types";

interface AlertRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editRule?: AlertRule | null;
}

export function AlertRuleDialog({
  open,
  onOpenChange,
  editRule,
}: AlertRuleDialogProps) {
  const { data: metrics } = useAlertableMetrics();
  const createRule = useCreateAlertRule();
  const updateRule = useUpdateAlertRule();

  const isEditing = !!editRule;

  const form = useForm<AlertRuleFormSchema>({
    resolver: zodResolver(alertRuleFormSchema),
    defaultValues: {
      name: "",
      description: "",
      metric: "policy_lapse_warning",
      comparison: "lte",
      threshold_value: 30,
      threshold_unit: "days",
      applies_to_self: true,
      applies_to_downlines: false,
      applies_to_team: false,
      notify_in_app: true,
      notify_email: false,
      cooldown_hours: 24,
    },
  });

  // Update form when editing rule changes
  useEffect(() => {
    if (editRule) {
      form.reset({
        name: editRule.name,
        description: editRule.description || "",
        metric: editRule.metric,
        comparison: editRule.comparison,
        threshold_value: editRule.threshold_value,
        threshold_unit: editRule.threshold_unit || undefined,
        applies_to_self: editRule.applies_to_self,
        applies_to_downlines: editRule.applies_to_downlines,
        applies_to_team: editRule.applies_to_team,
        notify_in_app: editRule.notify_in_app,
        notify_email: editRule.notify_email,
        cooldown_hours: editRule.cooldown_hours,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        metric: "policy_lapse_warning",
        comparison: "lte",
        threshold_value: 30,
        threshold_unit: "days",
        applies_to_self: true,
        applies_to_downlines: false,
        applies_to_team: false,
        notify_in_app: true,
        notify_email: false,
        cooldown_hours: 24,
      });
    }
  }, [editRule, form]);

  // Update defaults when metric changes
  const selectedMetric = form.watch("metric");
  useEffect(() => {
    if (!isEditing && metrics) {
      const metricConfig = metrics.find((m) => m.metric === selectedMetric);
      if (metricConfig) {
        form.setValue("threshold_value", metricConfig.default_threshold);
        form.setValue("threshold_unit", metricConfig.default_unit);
        form.setValue(
          "comparison",
          metricConfig.default_comparison as AlertComparison,
        );
      }
    }
  }, [selectedMetric, metrics, form, isEditing]);

  const onSubmit = async (data: AlertRuleFormSchema) => {
    try {
      if (isEditing && editRule) {
        await updateRule.mutateAsync({
          ruleId: editRule.id,
          formData: data,
        });
        toast.success("Alert rule updated");
      } else {
        await createRule.mutateAsync(data);
        toast.success("Alert rule created");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        isEditing
          ? "Failed to update alert rule"
          : "Failed to create alert rule",
      );
      console.error("Failed to save alert rule:", error);
    }
  };

  const isPending = createRule.isPending || updateRule.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Bell className="h-3.5 w-3.5 text-zinc-400" />
            <div>
              <DialogTitle className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                {isEditing ? "Edit Alert Rule" : "Create Alert Rule"}
              </DialogTitle>
              <DialogDescription className="text-[10px] text-zinc-500 dark:text-zinc-400">
                {isEditing
                  ? "Update the settings for this alert rule"
                  : "Set up a new alert to monitor business metrics"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="p-3 space-y-3"
          >
            {/* Basic Info */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Rule Name *
                  </Label>
                  <FormControl>
                    <Input
                      placeholder="e.g., Policy Lapse Warning"
                      className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Description (optional)
                  </Label>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this rule monitors..."
                      className="resize-none text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            {/* Metric Configuration */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              <h4 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                Alert Condition
              </h4>

              <FormField
                control={form.control}
                name="metric"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Metric
                    </Label>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isEditing}
                    >
                      <FormControl>
                        <SelectTrigger className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {metrics?.map((m) => (
                          <SelectItem
                            key={m.metric}
                            value={m.metric}
                            className="text-[11px]"
                          >
                            <div>
                              <div className="font-medium">{m.label}</div>
                              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                {m.description}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="comparison"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Condition
                      </Label>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(
                            Object.entries(COMPARISON_LABELS) as [
                              AlertComparison,
                              string,
                            ][]
                          ).map(([value, label]) => (
                            <SelectItem
                              key={value}
                              value={value}
                              className="text-[11px]"
                            >
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="threshold_value"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Threshold ({form.watch("threshold_unit") || "value"})
                      </Label>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Scope */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              <div>
                <h4 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                  Alert Scope
                </h4>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  Who should this alert monitor?
                </p>
              </div>

              <div className="space-y-1.5">
                <FormField
                  control={form.control}
                  name="applies_to_self"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded border border-zinc-200 dark:border-zinc-700 p-2">
                      <div>
                        <Label className="text-[11px] text-zinc-700 dark:text-zinc-300">
                          My own data
                        </Label>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          Monitor your personal metrics
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="applies_to_downlines"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded border border-zinc-200 dark:border-zinc-700 p-2">
                      <div>
                        <Label className="text-[11px] text-zinc-700 dark:text-zinc-300">
                          My downlines
                        </Label>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          Monitor agents in your hierarchy
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="applies_to_team"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded border border-zinc-200 dark:border-zinc-700 p-2">
                      <div>
                        <Label className="text-[11px] text-zinc-700 dark:text-zinc-300">
                          Entire team
                        </Label>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          Monitor all agents in your organization
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Notification Settings */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              <h4 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                Notification Settings
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="notify_in_app"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded border border-zinc-200 dark:border-zinc-700 p-2">
                      <Label className="text-[11px] text-zinc-700 dark:text-zinc-300">
                        In-app
                      </Label>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notify_email"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded border border-zinc-200 dark:border-zinc-700 p-2">
                      <Label className="text-[11px] text-zinc-700 dark:text-zinc-300">
                        Email
                      </Label>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="cooldown_hours"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Cooldown Period (hours)
                    </Label>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={168}
                        className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      Minimum time between repeat alerts for the same condition
                    </p>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-2 border-t border-zinc-100 dark:border-zinc-800 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                size="sm"
                className="h-7 text-[11px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                size="sm"
                className="h-7 text-[11px]"
              >
                {isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Rule"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
