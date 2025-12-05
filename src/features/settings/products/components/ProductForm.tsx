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
import { Product } from '../hooks/useProducts';
import { useCarriers } from '../../carriers/hooks/useCarriers';
import type { Database } from '@/types/database.types';
import { Check, ChevronsUpDown } from 'lucide-react';

type ProductType = Database['public']['Enums']['product_type'];

const PRODUCT_TYPES: ProductType[] = [
  'life',
  'annuity',
  'disability',
  'long_term_care',
  'other'
];

const productFormSchema = z.object({
  carrier_id: z.string().min(1, 'Please select a carrier'),
  name: z.string().min(1, 'Product name is required').max(100, 'Name is too long'),
  product_type: z.enum([
    'term_life',
    'whole_life',
    'universal_life',
    'variable_life',
    'health',
    'disability',
    'annuity'
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

  const selectedCarrier = carriers.find(c => c.id === form.watch('carrier_id'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            {product
              ? 'Update product information. Changes will affect commission calculations.'
              : 'Create a new insurance product under a carrier.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="carrier_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Carrier *</FormLabel>
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={carrierSearchOpen}
                      className="w-full justify-between"
                      onClick={() => setCarrierSearchOpen(!carrierSearchOpen)}
                    >
                      {selectedCarrier ? selectedCarrier.name : "Select carrier..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                    {carrierSearchOpen && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-0 shadow-md">
                        <Command>
                          <CommandInput placeholder="Search carriers..." />
                          <CommandEmpty>No carrier found.</CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-auto">
                            {carriers.filter(c => c.is_active).map((carrier) => (
                              <CommandItem
                                key={carrier.id}
                                value={carrier.name}
                                onSelect={() => {
                                  form.setValue('carrier_id', carrier.id);
                                  setCarrierSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    carrier.id === field.value ? "opacity-100" : "opacity-0"
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
                  <FormDescription>
                    The insurance carrier for this product
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Whole Life 0-75"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    The specific product name
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="product_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Type *</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {PRODUCT_TYPES.map((type) => (
                      <Badge
                        key={type}
                        variant={field.value === type ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => field.onChange(type)}
                      >
                        {type.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                  <FormDescription>
                    Select the insurance product type
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
                      Inactive products won't appear in dropdowns
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

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
