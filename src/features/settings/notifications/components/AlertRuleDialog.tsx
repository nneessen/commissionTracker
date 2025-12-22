/**
 * Alert Rule Dialog
 *
 * Dialog for creating and editing alert rules.
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { Separator } from "@/components/ui/separator";

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

export function AlertRuleDialog({ open, onOpenChange, editRule }: AlertRuleDialogProps) {
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
        form.setValue("comparison", metricConfig.default_comparison as AlertComparison);
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
      toast.error(isEditing ? "Failed to update alert rule" : "Failed to create alert rule");
      console.error("Failed to save alert rule:", error);
    }
  };

  const isPending = createRule.isPending || updateRule.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Alert Rule" : "Create Alert Rule"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the settings for this alert rule"
              : "Set up a new alert to monitor business metrics"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Info */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rule Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Policy Lapse Warning" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this rule monitors..."
                      className="resize-none h-16"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Metric Configuration */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Alert Condition</h4>

              <FormField
                control={form.control}
                name="metric"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Metric</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isEditing}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {metrics?.map((m) => (
                          <SelectItem key={m.metric} value={m.metric}>
                            <div>
                              <div className="font-medium">{m.label}</div>
                              <div className="text-xs text-muted-foreground">{m.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="comparison"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.entries(COMPARISON_LABELS) as [AlertComparison, string][]).map(
                            ([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="threshold_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Threshold ({form.watch("threshold_unit") || "value"})
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Scope */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Alert Scope</h4>
              <p className="text-xs text-muted-foreground">
                Who should this alert monitor?
              </p>

              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="applies_to_self"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel className="text-sm">My own data</FormLabel>
                        <FormDescription className="text-xs">
                          Monitor your personal metrics
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="applies_to_downlines"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel className="text-sm">My downlines</FormLabel>
                        <FormDescription className="text-xs">
                          Monitor agents in your hierarchy
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="applies_to_team"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel className="text-sm">Entire team</FormLabel>
                        <FormDescription className="text-xs">
                          Monitor all agents in your organization
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Notification Settings */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Notification Settings</h4>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="notify_in_app"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel className="text-sm">In-app</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notify_email"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel className="text-sm">Email</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="cooldown_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cooldown Period (hours)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={168}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Minimum time between repeat alerts for the same condition
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Rule"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
