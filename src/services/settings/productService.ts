import { supabase } from "@/services/base/supabase";
import type { Database } from "@/types/database.types";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

export interface ProductCreateData {
  carrier_id: string;
  name: string;
  product_type: Database["public"]["Enums"]["product_type"];
  code?: string;
  description?: string;
  min_premium?: number;
  max_premium?: number;
  min_age?: number;
  max_age?: number;
  commission_percentage?: number;
  is_active?: boolean;
}

class ProductService {
  private client = supabase;

  async getAllProducts(): Promise<ProductRow[]> {
    const { data, error } = await this.client
      .from("products")
      .select("*")
      .order("name");

    if (error) throw error;
    return data || [];
  }

  async getProductsByCarrier(carrierId: string): Promise<ProductRow[]> {
    const { data, error } = await this.client
      .from("products")
      .select("*")
      .eq("carrier_id", carrierId)
      .order("name");

    if (error) throw error;
    return data || [];
  }

  async getActiveProducts(): Promise<ProductRow[]> {
    const { data, error } = await this.client
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    return data || [];
  }

  /**
   * Get a single product by ID
   */
  async getProductById(id: string): Promise<ProductRow | null> {
    const { data, error } = await this.client
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create a new product
   */
  async createProduct(product: ProductCreateData): Promise<ProductRow> {
    const { data, error } = await this.client
      .from("products")
      .insert({
        ...product,
        is_active: product.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update a product
   */
  async updateProduct(id: string, updates: ProductUpdate): Promise<ProductRow> {
    const { data, error } = await this.client
      .from("products")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: string): Promise<void> {
    const { error } = await this.client.from("products").delete().eq("id", id);

    if (error) throw error;
  }

  /**
   * Search products by name
   */
  async searchProducts(searchTerm: string): Promise<ProductRow[]> {
    const { data, error } = await this.client
      .from("products")
      .select("*")
      .ilike("name", `%${searchTerm}%`)
      .order("name");

    if (error) throw error;
    return data || [];
  }

  /**
   * Bulk create products
   */
  async bulkCreateProducts(
    products: ProductCreateData[],
  ): Promise<ProductRow[]> {
    const { data, error } = await this.client
      .from("products")
      .insert(
        products.map((p) => ({
          ...p,
          is_active: p.is_active ?? true,
        })),
      )
      .select();

    if (error) throw error;
    return data || [];
  }
}

export const productService = new ProductService();
