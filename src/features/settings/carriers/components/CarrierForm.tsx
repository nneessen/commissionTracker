// src/features/settings/carriers/components/CarrierForm.tsx
// Redesigned with zinc palette and compact design patterns

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Carrier } from "../hooks/useCarriers";
import { useImo } from "@/contexts/ImoContext";
import { useAllActiveImos } from "@/hooks/imo";

const carrierFormSchema = z.object({
  name: z
    .string()
    .min(1, "Carrier name is required")
    .max(100, "Name is too long"),
  code: z.string().max(50, "Code is too long").optional().or(z.literal("")),
  is_active: z.boolean(),
  imo_id: z.string().optional(),
});

type CarrierFormValues = z.infer<typeof carrierFormSchema>;

interface CarrierFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carrier?: Carrier | null;
  onSubmit: (data: CarrierFormValues) => void;
  isSubmitting?: boolean;
}

export function CarrierForm({
  open,
  onOpenChange,
  carrier,
  onSubmit,
  isSubmitting = false,
}: CarrierFormProps) {
  const { isSuperAdmin, imo } = useImo();
  const { data: allImos = [] } = useAllActiveImos({ enabled: isSuperAdmin });

  const form = useForm<CarrierFormValues>({
    resolver: zodResolver(carrierFormSchema),
    defaultValues: {
      name: "",
      code: undefined,
      is_active: true,
      imo_id: undefined,
    },
  });

  // Reset form when carrier changes or sheet opens/closes
  useEffect(() => {
    if (carrier) {
      form.reset({
        name: carrier.name || "",
        code: carrier.code || undefined,
        is_active: carrier.is_active ?? true,
        imo_id: carrier.imo_id || undefined,
      });
    } else {
      form.reset({
        name: "",
        code: undefined,
        is_active: true,
        // Default to user's IMO for new carriers
        imo_id: imo?.id || undefined,
      });
    }
  }, [carrier, open, form, imo?.id]);

  const handleSubmit = (data: CarrierFormValues) => {
    onSubmit(data);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md p-3 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
        <SheetHeader className="space-y-1 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <SheetTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {carrier ? "Edit Carrier" : "Add New Carrier"}
          </SheetTitle>
          <SheetDescription className="text-[10px] text-zinc-500 dark:text-zinc-400">
            {carrier
              ? "Update carrier information. Changes will affect all associated products."
              : "Create a new insurance carrier. You can add products to this carrier later."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-3 py-3"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Carrier Name *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Foresters Financial"
                      {...field}
                      value={field.value || ""}
                      className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                    />
                  </FormControl>
                  <FormDescription className="text-[10px] text-zinc-400">
                    The official name of the insurance carrier
                  </FormDescription>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Code (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., FRST"
                      {...field}
                      value={field.value || ""}
                      className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                    />
                  </FormControl>
                  <FormDescription className="text-[10px] text-zinc-400">
                    A short code or acronym for display purposes
                  </FormDescription>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            {/* IMO Selector - Only shown for super admins */}
            {isSuperAdmin && allImos.length > 0 && (
              <FormField
                control={form.control}
                name="imo_id"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                      IMO *
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
                          <SelectValue placeholder="Select IMO" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allImos.map((imoOption) => (
                          <SelectItem
                            key={imoOption.id}
                            value={imoOption.id}
                            className="text-[11px]"
                          >
                            {imoOption.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-[10px] text-zinc-400">
                      Which IMO this carrier belongs to
                    </FormDescription>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-700 p-2">
                  <div className="space-y-0.5">
                    <FormLabel className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
                      Active Status
                    </FormLabel>
                    <FormDescription className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Inactive carriers won't appear in dropdowns
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="h-4 w-4"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <SheetFooter className="gap-1 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="h-7 px-2 text-[10px] border-zinc-200 dark:border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="h-7 px-2 text-[10px]"
              >
                {isSubmitting
                  ? "Saving..."
                  : carrier
                    ? "Update Carrier"
                    : "Create Carrier"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
