/**
 * Notification Preferences Section
 *
 * UI for managing notification delivery preferences.
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, Bell, Mail, Clock } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/alerts";
import { TIMEZONE_OPTIONS, DIGEST_FREQUENCY_OPTIONS } from "@/types/alert-rules.types";

const preferencesSchema = z.object({
  in_app_enabled: z.boolean(),
  browser_push_enabled: z.boolean(),
  email_digest_enabled: z.boolean(),
  email_digest_frequency: z.string(),
  email_digest_time: z.string(),
  email_digest_timezone: z.string(),
  quiet_hours_enabled: z.boolean(),
  quiet_hours_start: z.string(),
  quiet_hours_end: z.string(),
});

type PreferencesFormData = z.infer<typeof preferencesSchema>;

// Time options for digest delivery
const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0");
  const label = i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`;
  return { value: `${hour}:00:00`, label };
});

export function NotificationPreferencesSection() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();

  const form = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      in_app_enabled: true,
      browser_push_enabled: false,
      email_digest_enabled: false,
      email_digest_frequency: "daily",
      email_digest_time: "09:00:00",
      email_digest_timezone: "America/New_York",
      quiet_hours_enabled: false,
      quiet_hours_start: "22:00:00",
      quiet_hours_end: "08:00:00",
    },
  });

  // Update form when preferences load
  useEffect(() => {
    if (preferences) {
      form.reset({
        in_app_enabled: preferences.in_app_enabled ?? true,
        browser_push_enabled: preferences.browser_push_enabled ?? false,
        email_digest_enabled: preferences.email_digest_enabled ?? false,
        email_digest_frequency: preferences.email_digest_frequency ?? "daily",
        email_digest_time: preferences.email_digest_time ?? "09:00:00",
        email_digest_timezone: preferences.email_digest_timezone ?? "America/New_York",
        quiet_hours_enabled: preferences.quiet_hours_enabled ?? false,
        quiet_hours_start: preferences.quiet_hours_start ?? "22:00:00",
        quiet_hours_end: preferences.quiet_hours_end ?? "08:00:00",
      });
    }
  }, [preferences, form]);

  const onSubmit = async (data: PreferencesFormData) => {
    try {
      await updatePreferences.mutateAsync({
        in_app_enabled: data.in_app_enabled,
        browser_push_enabled: data.browser_push_enabled,
        email_digest_enabled: data.email_digest_enabled,
        email_digest_frequency: data.email_digest_frequency,
        email_digest_time: data.email_digest_time,
        email_digest_timezone: data.email_digest_timezone,
        quiet_hours_enabled: data.quiet_hours_enabled,
        quiet_hours_start: data.quiet_hours_start,
        quiet_hours_end: data.quiet_hours_end,
      });
      toast.success("Preferences saved successfully");
    } catch (error) {
      toast.error("Failed to save preferences");
      console.error("Failed to save preferences:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* In-App Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">In-App Notifications</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Notifications shown in the app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <FormField
              control={form.control}
              name="in_app_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">Enable in-app notifications</FormLabel>
                    <FormDescription className="text-xs">
                      Show notification bell and dropdown
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Email Digest */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Email Digest</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Receive a summary of notifications via email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <FormField
              control={form.control}
              name="email_digest_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">Enable email digest</FormLabel>
                    <FormDescription className="text-xs">
                      Get unread notifications sent to your email
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("email_digest_enabled") && (
              <>
                <Separator />
                <div className="grid gap-3 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="email_digest_frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Frequency</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DIGEST_FREQUENCY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email_digest_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Delivery Time</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIME_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email_digest_timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Timezone</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIMEZONE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Quiet Hours</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Pause notifications during specified hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <FormField
              control={form.control}
              name="quiet_hours_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">Enable quiet hours</FormLabel>
                    <FormDescription className="text-xs">
                      Suppress notifications during these hours
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("quiet_hours_enabled") && (
              <>
                <Separator />
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="quiet_hours_start"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Start Time</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIME_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quiet_hours_end"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">End Time</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIME_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={updatePreferences.isPending || !form.formState.isDirty}
            className="gap-2"
          >
            {updatePreferences.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Preferences
          </Button>
        </div>
      </form>
    </Form>
  );
}
