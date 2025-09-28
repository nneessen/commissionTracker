// Local API client that mimics Supabase interface for local development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface QueryResult<T> {
  data: T | null;
  error: any | null;
  count?: number | null;
}

class LocalApiClient {
  private tableName: string = '';

  from(table: string) {
    this.tableName = table;
    return this;
  }

  async select(columns?: string): Promise<QueryResult<any[]>> {
    try {
      const response = await fetch(`${API_URL}/rest/v1/${this.tableName}`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Handle paginated responses
      if (data.data && data.pagination) {
        return { data: data.data, error: null };
      }

      return { data, error: null };
    } catch (error) {
      console.error(`Error fetching from ${this.tableName}:`, error);
      return { data: null, error };
    }
  }

  async insert(values: any | any[]): Promise<QueryResult<any>> {
    try {
      const isArray = Array.isArray(values);
      const response = await fetch(`${API_URL}/rest/v1/${this.tableName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data: isArray ? data : [data], error: null };
    } catch (error) {
      console.error(`Error inserting into ${this.tableName}:`, error);
      return { data: null, error };
    }
  }

  async update(values: any): Promise<QueryResult<any>> {
    return this.updateWithFilter(values);
  }

  async upsert(values: any | any[]): Promise<QueryResult<any>> {
    // For simplicity, just use insert for now
    return this.insert(values);
  }

  async delete(): Promise<QueryResult<any>> {
    return this.deleteWithFilter();
  }

  // Filter methods (chainable)
  eq(column: string, value: any) {
    // Store filter for later use
    return this;
  }

  neq(column: string, value: any) {
    return this;
  }

  gt(column: string, value: any) {
    return this;
  }

  gte(column: string, value: any) {
    return this;
  }

  lt(column: string, value: any) {
    return this;
  }

  lte(column: string, value: any) {
    return this;
  }

  like(column: string, pattern: string) {
    return this;
  }

  ilike(column: string, pattern: string) {
    return this;
  }

  is(column: string, value: any) {
    return this;
  }

  in(column: string, values: any[]) {
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    return this;
  }

  limit(count: number) {
    return this;
  }

  range(from: number, to: number) {
    return this;
  }

  single() {
    return this;
  }

  // Helper methods for filtered operations
  private async updateWithFilter(values: any): Promise<QueryResult<any>> {
    try {
      // For now, assume we have an ID in the values
      const id = values.id;
      if (!id) {
        throw new Error('Update requires an ID');
      }

      const response = await fetch(`${API_URL}/rest/v1/${this.tableName}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data: [data], error: null };
    } catch (error) {
      console.error(`Error updating ${this.tableName}:`, error);
      return { data: null, error };
    }
  }

  private async deleteWithFilter(): Promise<QueryResult<any>> {
    try {
      // For now, this is a placeholder
      // Real implementation would need to track filters
      return { data: [], error: null };
    } catch (error) {
      console.error(`Error deleting from ${this.tableName}:`, error);
      return { data: null, error };
    }
  }
}

// Create a singleton instance
export const localApi = new LocalApiClient();

// Export a factory function that returns a new instance for each query
export const createLocalApiClient = () => {
  return {
    from: (table: string) => {
      const client = new LocalApiClient();
      return client.from(table);
    }
  };
};