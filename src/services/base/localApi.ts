// Local API client that mimics Supabase interface for local development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface QueryResult<T> {
  data: T | null;
  error: any | null;
  count?: number | null;
}

interface QueryFilter {
  type: string;
  column: string;
  value: any;
}

interface QueryOrder {
  column: string;
  ascending: boolean;
}

interface QueryState {
  table: string;
  select: string[];
  filters: QueryFilter[];
  ordering: QueryOrder[];
  limit?: number;
  offset?: number;
  single?: boolean;
  operation?: 'select' | 'insert' | 'update' | 'delete';
  data?: any;
}

class LocalApiClient {
  private tableName: string = '';
  private queryState: QueryState = {
    table: '',
    select: ['*'],
    filters: [],
    ordering: []
  };

  from(table: string) {
    this.tableName = table;
    this.queryState = {
      table,
      select: ['*'],
      filters: [],
      ordering: []
    };
    return this;
  }

  select(columns?: string) {
    if (columns) {
      this.queryState.select = columns.split(',').map(c => c.trim());
    }
    return this;
  }

  private async execute(): Promise<QueryResult<any>> {
    try {
      // Handle different operations
      if (this.queryState.operation === 'update') {
        return this.executeUpdate();
      } else if (this.queryState.operation === 'delete') {
        return this.executeDelete();
      } else if (this.queryState.operation === 'insert') {
        return this.executeInsert();
      }

      // Default to select operation
      const url = this.buildQueryUrl();
      const response = await fetch(url, {
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

      // Handle single record requests
      if (this.queryState.single && Array.isArray(data)) {
        return { data: data[0] || null, error: null };
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

  update(values: any) {
    this.queryState.operation = 'update';
    this.queryState.data = values;
    return this;
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
    this.queryState.filters.push({ type: 'eq', column, value });
    return this;
  }

  neq(column: string, value: any) {
    this.queryState.filters.push({ type: 'neq', column, value });
    return this;
  }

  gt(column: string, value: any) {
    this.queryState.filters.push({ type: 'gt', column, value });
    return this;
  }

  gte(column: string, value: any) {
    this.queryState.filters.push({ type: 'gte', column, value });
    return this;
  }

  lt(column: string, value: any) {
    this.queryState.filters.push({ type: 'lt', column, value });
    return this;
  }

  lte(column: string, value: any) {
    this.queryState.filters.push({ type: 'lte', column, value });
    return this;
  }

  like(column: string, pattern: string) {
    this.queryState.filters.push({ type: 'like', column, value: pattern });
    return this;
  }

  ilike(column: string, pattern: string) {
    this.queryState.filters.push({ type: 'ilike', column, value: pattern });
    return this;
  }

  is(column: string, value: any) {
    this.queryState.filters.push({ type: 'is', column, value });
    return this;
  }

  in(column: string, values: any[]) {
    this.queryState.filters.push({ type: 'in', column, value: values });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.queryState.ordering.push({
      column,
      ascending: options?.ascending !== false
    });
    return new QueryChain(this);
  }

  limit(count: number) {
    this.queryState.limit = count;
    return new QueryChain(this);
  }

  range(from: number, to: number) {
    this.queryState.limit = to - from + 1;
    this.queryState.offset = from;
    return this;
  }

  async single() {
    this.queryState.single = true;
    this.queryState.limit = 1;
    // Execute the operation and return the promise
    const result = await this.execute();
    return result;
  }

  // Make this class thenable so it works like Supabase
  then(onFulfilled?: any, onRejected?: any) {
    return this.execute().then(onFulfilled, onRejected);
  }

  catch(onRejected?: any) {
    return this.execute().catch(onRejected);
  }

  // Build query URL with parameters
  private buildQueryUrl(): string {
    const params = new URLSearchParams();

    // Add filters
    this.queryState.filters.forEach(filter => {
      if (filter.type === 'in') {
        params.append(`${filter.column}.${filter.type}`, `(${filter.value.join(',')})`);
      } else {
        params.append(`${filter.column}.${filter.type}`, filter.value.toString());
      }
    });

    // Add ordering
    if (this.queryState.ordering.length > 0) {
      const orderStr = this.queryState.ordering
        .map(o => `${o.column}.${o.ascending ? 'asc' : 'desc'}`)
        .join(',');
      params.append('order', orderStr);
    }

    // Add limit/offset
    if (this.queryState.limit) {
      params.append('limit', this.queryState.limit.toString());
    }
    if (this.queryState.offset) {
      params.append('offset', this.queryState.offset.toString());
    }

    // Add selected columns
    if (this.queryState.select.length > 0 && !this.queryState.select.includes('*')) {
      params.append('select', this.queryState.select.join(','));
    }

    const queryString = params.toString();
    return `${API_URL}/rest/v1/${this.queryState.table}${queryString ? '?' + queryString : ''}`;
  }

  // Helper methods for filtered operations
  private async executeUpdate(): Promise<QueryResult<any>> {
    try {
      // Get the ID from filters (should be set by .eq("id", value))
      const idFilter = this.queryState.filters.find(f => f.column === 'id' && f.type === 'eq');
      if (!idFilter) {
        throw new Error('Update requires an ID filter (use .eq("id", value))');
      }

      const id = idFilter.value;
      const response = await fetch(`${API_URL}/rest/v1/${this.queryState.table}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.queryState.data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Return single item if single() was called, otherwise return array
      if (this.queryState.single) {
        return { data, error: null };
      }
      return { data: [data], error: null };
    } catch (error) {
      console.error(`Error updating ${this.queryState.table}:`, error);
      return { data: null, error };
    }
  }

  private async executeInsert(): Promise<QueryResult<any>> {
    // Placeholder for insert execution
    return { data: null, error: new Error('Insert execution not implemented') };
  }

  private async executeDelete(): Promise<QueryResult<any>> {
    // Placeholder for delete execution
    return { data: null, error: new Error('Delete execution not implemented') };
  }

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

// Helper class for method chaining
class QueryChain {
  private client: LocalApiClient;

  constructor(client: LocalApiClient) {
    this.client = client;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.client.order(column, options);
    return this;
  }

  limit(count: number) {
    this.client.limit(count);
    return this;
  }

  eq(column: string, value: any) {
    this.client.eq(column, value);
    return this;
  }

  // Execute when awaited
  then(onFulfilled?: any, onRejected?: any) {
    return this.client.execute().then(onFulfilled, onRejected);
  }

  catch(onRejected?: any) {
    return this.client.execute().catch(onRejected);
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