import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Carrier } from '../hooks/useCarriers';

const carrierFormSchema = z.object({
  name: z.string().min(1, 'Carrier name is required').max(100, 'Name is too long'),
  short_name: z.string().max(50, 'Short name is too long').optional().or(z.literal('')),
  is_active: z.boolean(),
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
  const form = useForm<CarrierFormValues>({
    resolver: zodResolver(carrierFormSchema),
    defaultValues: {
      name: '',
      short_name: undefined,
      is_active: true,
    },
  });

  // Reset form when carrier changes or sheet opens/closes
  useEffect(() => {
    if (carrier) {
      form.reset({
        name: carrier.name || '',
        short_name: carrier.short_name || undefined,
        is_active: carrier.is_active ?? true,
      });
    } else {
      form.reset({
        name: '',
        short_name: undefined,
        is_active: true,
      });
    }
  }, [carrier, open, form]);

  const handleSubmit = (data: CarrierFormValues) => {
    onSubmit(data);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[540px]">
        <SheetHeader>
          <SheetTitle>{carrier ? 'Edit Carrier' : 'Add New Carrier'}</SheetTitle>
          <SheetDescription>
            {carrier
              ? 'Update carrier information. Changes will affect all associated products.'
              : 'Create a new insurance carrier. You can add products to this carrier later.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Carrier Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Foresters Financial"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    The official name of the insurance carrier
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="short_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Short Name (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Foresters"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    A shorter version or acronym for display purposes
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <FormDescription>
                      Inactive carriers won't appear in dropdowns
                    </FormDescription>
                  </div>
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <SheetFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : carrier ? 'Update Carrier' : 'Create Carrier'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
