// src/services/productService.ts

import { supabase, TABLES } from '../base/supabase';
import { Product, ProductWithRates, NewProductForm, UpdateProductForm } from '../../types/product.types';

export interface CreateProductData {
  productName: string;
  productType: Product['productType'];
  carrierId: string;
  isActive?: boolean;
}

export interface UpdateProductData extends Partial<CreateProductData> {
  id: string;
}

class ProductService {
  async getAll(): Promise<Product[]> {
    const { data, error } = await supabase
      .from(TABLES.PRODUCTS)
      .select('*')
      .order('product_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getByCarrier(carrierId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from(TABLES.PRODUCTS)
      .select('*')
      .eq('carrier_id', carrierId)
      .order('product_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch products for carrier: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getWithRates(carrierId?: string): Promise<ProductWithRates[]> {
    let query = supabase
      .from(TABLES.PRODUCTS)
      .select(`
        *,
        carriers!inner(name),
        commission_rates(*)
      `)
      .order('product_name', { ascending: true });

    if (carrierId) {
      query = query.eq('carrier_id', carrierId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch products with rates: ${error.message}`);
    }

    return data?.map(this.transformWithRatesFromDB) || [];
  }

  async getActive(carrierId?: string): Promise<Product[]> {
    let query = supabase
      .from(TABLES.PRODUCTS)
      .select('*')
      .eq('is_active', true)
      .order('product_name', { ascending: true });

    if (carrierId) {
      query = query.eq('carrier_id', carrierId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch active products: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from(TABLES.PRODUCTS)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch product: ${error.message}`);
    }

    return data ? this.transformFromDB(data) : null;
  }

  async create(productData: CreateProductData): Promise<Product> {
    const dbData = this.transformToDB(productData);

    const { data, error } = await supabase
      .from(TABLES.PRODUCTS)
      .insert(dbData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create product: ${error.message}`);
    }

    return this.transformFromDB(data);
  }

  async update(id: string, updates: Partial<CreateProductData>): Promise<Product> {
    const dbData = this.transformToDB(updates);
    dbData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from(TABLES.PRODUCTS)
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update product: ${error.message}`);
    }

    return this.transformFromDB(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.PRODUCTS)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  }

  async toggleActive(id: string): Promise<Product> {
    const product = await this.getById(id);
    if (!product) {
      throw new Error('Product not found');
    }

    return this.update(id, { isActive: !product.isActive });
  }

  private transformFromDB(dbData: any): Product {
    return {
      id: dbData.id,
      carrierId: dbData.carrier_id,
      productName: dbData.product_name,
      productType: dbData.product_type,
      isActive: dbData.is_active,
      createdAt: new Date(dbData.created_at),
      updatedAt: dbData.updated_at ? new Date(dbData.updated_at) : undefined,
    };
  }

  private transformWithRatesFromDB(dbData: any): ProductWithRates {
    const product = this.transformFromDB(dbData);
    return {
      ...product,
      commissionRates: dbData.commission_rates || [],
      carrierName: dbData.carriers?.name,
    };
  }

  private transformToDB(data: Partial<CreateProductData>): any {
    const dbData: any = {};

    if (data.productName !== undefined) dbData.product_name = data.productName;
    if (data.productType !== undefined) dbData.product_type = data.productType;
    if (data.carrierId !== undefined) dbData.carrier_id = data.carrierId;
    if (data.isActive !== undefined) dbData.is_active = data.isActive;

    return dbData;
  }
}

export const productService = new ProductService();