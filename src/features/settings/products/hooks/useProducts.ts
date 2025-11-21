import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '@/services/settings/productService';
import { toast } from 'sonner';
import type { Database } from '@/types/database.types';

type ProductType = Database['public']['Enums']['product_type'];

export interface Product {
  id: string;
  carrier_id: string;
  name: string;
  product_type: ProductType;
  is_active: boolean;
  commission_percentage?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProductData {
  carrier_id: string;
  name: string;
  product_type: ProductType;
  is_active?: boolean;
  commission_percentage?: number;
}

export interface UpdateProductData {
  name?: string;
  product_type?: ProductType;
  is_active?: boolean;
  commission_percentage?: number;
}

export function useProducts() {
  const queryClient = useQueryClient();

  // Fetch all products
  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<Product[]> => {
      const result = await productService.getAllProducts();
      // Transform database rows to Product interface
      return (result || []).map(row => ({
        id: row.id,
        carrier_id: row.carrier_id,
        name: row.name,
        product_type: row.product_type,
        is_active: row.is_active ?? true,
        commission_percentage: row.commission_percentage ?? undefined,
        created_at: row.created_at ?? undefined,
        updated_at: row.updated_at ?? undefined,
      }));
    },
  });

  // Create product mutation
  const createProduct = useMutation({
    mutationFn: async (data: CreateProductData) => {
      const result = await productService.createProduct({
        ...data,
        is_active: data.is_active ?? true,
      });
      if (!result) throw new Error('Failed to create product');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['commission-grid'] });
      toast.success('Product created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create product: ${error.message}`);
    },
  });

  // Update product mutation
  const updateProduct = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProductData }) => {
      const result = await productService.updateProduct(id, data);
      if (!result) throw new Error('Failed to update product');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['commission-grid'] });
      toast.success('Product updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update product: ${error.message}`);
    },
  });

  // Delete product mutation
  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      await productService.deleteProduct(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['commission-grid'] });
      toast.success('Product deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete product: ${error.message}`);
    },
  });

  // Bulk import products
  const bulkImportProducts = useMutation({
    mutationFn: async (products: CreateProductData[]) => {
      const result = await productService.bulkCreateProducts(products);
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['commission-grid'] });
      toast.success(`Successfully imported ${data?.length || 0} products`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to import products: ${error.message}`);
    },
  });

  return {
    products,
    isLoading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
    bulkImportProducts,
  };
}
