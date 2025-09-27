// src/hooks/products/useProducts.ts

import { useState, useEffect } from 'react';
import { productService, CreateProductData } from '../../services';
import { Product, ProductWithRates } from '../../types/product.types';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productService.getAll();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (productData: CreateProductData) => {
    try {
      setError(null);
      const newProduct = await productService.create(productData);
      setProducts(prev => [...prev, newProduct]);
      return newProduct;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create product';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateProduct = async (id: string, updates: Partial<CreateProductData>) => {
    try {
      setError(null);
      const updatedProduct = await productService.update(id, updates);
      setProducts(prev => prev.map(p => p.id === id ? updatedProduct : p));
      return updatedProduct;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update product';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      setError(null);
      await productService.delete(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete product';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const toggleProductActive = async (id: string) => {
    try {
      setError(null);
      const updatedProduct = await productService.toggleActive(id);
      setProducts(prev => prev.map(p => p.id === id ? updatedProduct : p));
      return updatedProduct;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle product status';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return {
    products,
    loading,
    error,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleProductActive,
  };
};

export const useProductsByCarrier = (carrierId?: string) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    if (!carrierId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await productService.getByCarrier(carrierId);
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
      console.error('Failed to fetch products by carrier:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [carrierId]);

  return {
    products,
    loading,
    error,
    fetchProducts,
  };
};

export const useProductsWithRates = (carrierId?: string) => {
  const [products, setProducts] = useState<ProductWithRates[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productService.getWithRates(carrierId);
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products with rates');
      console.error('Failed to fetch products with rates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [carrierId]);

  return {
    products,
    loading,
    error,
    fetchProducts,
  };
};