// src/features/settings/products/components/ProductForm.tsx
// Redesigned with zinc palette and compact design patterns

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Product } from '../hooks/useProducts';
import { useCarriers } from '../../carriers/hooks/useCarriers';
import type { Database } from '@/types/database.types';
import { Check, ChevronsUpDown } from 'lucide-react';

type ProductType = Database['public']['Enums']['product_type'];

const PRODUCT_TYPES: ProductType[] = [
  'term_life',
  'whole_life',
  'universal_life',
  'variable_life',
  'indexed_universal_life',
  'participating_whole_life',
  'health',
  'disability',
  'annuity',
];

const productFormSchema = z.object({
  carrier_id: z.string().min(1, 'Please select a carrier'),
  name: z.string().min(1, 'Product name is required').max(100, 'Name is too long'),
  product_type: z.enum([
    'term_life',
    'whole_life',
    'universal_life',
    'variable_life',
    'indexed_universal_life',
    'participating_whole_life',
    'health',
    'disability',
    'annuity',
  ]),
  is_active: z.boolean(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSubmit: (data: ProductFormValues) => void;
  isSubmitting?: boolean;
}

export function ProductForm({
  open,
  onOpenChange,
  product,
  onSubmit,
  isSubmitting = false,
}: ProductFormProps) {
  const { carriers } = useCarriers();
  const [carrierSearchOpen, setCarrierSearchOpen] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      carrier_id: '',
      name: '',
      product_type: 'term_life',
      is_active: true,
    },
  });

  // Reset form when product changes or dialog opens/closes
  useEffect(() => {
    if (product) {
      form.reset({
        carrier_id: product.carrier_id || '',
        name: product.name || '',
        product_type: product.product_type || 'term_life',
        is_active: product.is_active ?? true,
      });
    } else {
      form.reset({
        carrier_id: '',
        name: '',
        product_type: 'term_life',
        is_active: true,
      });
    }
  }, [product, open, form]);

  const handleSubmit = (data: ProductFormValues) => {
    onSubmit(data);
  };

  const selectedCarrier = carriers.find((c) => c.id === form.watch('carrier_id'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-3 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
        <DialogHeader className="space-y-1 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <DialogTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {product ? 'Edit Product' : 'Add New Product'}
          </DialogTitle>
          <DialogDescription className="text-[10px] text-zinc-500 dark:text-zinc-400">
            {product
              ? 'Update product information. Changes will affect commission calculations.'
              : 'Create a new insurance product under a carrier.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 py-3">
            <FormField
              control={form.control}
              name="carrier_id"
              render={({ field }) => (
                <FormItem className="flex flex-col space-y-1">
                  <FormLabel className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Carrier *
                  </FormLabel>
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={carrierSearchOpen}
                      className="w-full justify-between h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                      onClick={() => setCarrierSearchOpen(!carrierSearchOpen)}
                    >
                      {selectedCarrier ? selectedCarrier.name : 'Select carrier...'}
                      <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                    {carrierSearchOpen && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-0 shadow-md">
                        <Command>
                          <CommandInput
                            placeholder="Search carriers..."
                            className="h-7 text-[11px]"
                          />
                          <CommandEmpty className="text-[11px] py-2 text-center">
                            No carrier found.
                          </CommandEmpty>
                          <CommandGroup className="max-h-48 overflow-auto">
                            {carriers
                              .filter((c) => c.is_active)
                              .map((carrier) => (
                                <CommandItem
                                  key={carrier.id}
                                  value={carrier.name}
                                  className="text-[11px]"
                                  onSelect={() => {
                                    form.setValue('carrier_id', carrier.id);
                                    setCarrierSearchOpen(false);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-3 w-3 ${
                                      carrier.id === field.value ? 'opacity-100' : 'opacity-0'
                                    }`}
                                  />
                                  {carrier.name}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </Command>
                      </div>
                    )}
                  </div>
                  <FormDescription className="text-[10px] text-zinc-400">
                    The insurance carrier for this product
                  </FormDescription>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Product Name *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Whole Life 0-75"
                      {...field}
                      value={field.value || ''}
                      className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                    />
                  </FormControl>
                  <FormDescription className="text-[10px] text-zinc-400">
                    The specific product name
                  </FormDescription>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="product_type"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Product Type *
                  </FormLabel>
                  <div className="flex flex-wrap gap-1">
                    {PRODUCT_TYPES.map((type) => (
                      <Badge
                        key={type}
                        variant={field.value === type ? 'default' : 'outline'}
                        className="cursor-pointer text-[10px] h-5 px-1.5"
                        onClick={() => field.onChange(type)}
                      >
                        {type.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                  <FormDescription className="text-[10px] text-zinc-400">
                    Select the insurance product type
                  </FormDescription>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

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
                      Inactive products won't appear in dropdowns
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

            <DialogFooter className="gap-1 pt-3 border-t border-zinc-100 dark:border-zinc-800">
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
                {isSubmitting ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
