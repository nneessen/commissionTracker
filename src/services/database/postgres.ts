// Direct PostgreSQL API for local development
class PostgresAPI {
  private baseUrl = 'http://localhost:3001/api'; // We'll create a simple API server
  
  async query(sql: string, params: any[] = []) {
    const response = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params })
    });
    
    if (!response.ok) {
      throw new Error(`Database query failed: ${response.statusText}`);
    }
    
    return response.json();
  }

  async select(table: string, options: any = {}) {
    let sql = `SELECT * FROM ${table}`;
    const params: any[] = [];
    
    if (options.where) {
      const conditions = Object.entries(options.where)
        .map(([key, value], index) => {
          params.push(value);
          return `${key} = $${index + 1}`;
        });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    if (options.order) {
      sql += ` ORDER BY ${options.order}`;
    }
    
    return this.query(sql, params);
  }

  async insert(table: string, data: any) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`);
    
    const sql = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;
    
    return this.query(sql, values);
  }

  async update(table: string, data: any, where: any) {
    const updates = Object.entries(data)
      .map(([key, value], index) => `${key} = $${index + 1}`);
    const updateValues = Object.values(data);
    
    const conditions = Object.entries(where)
      .map(([key, value], index) => {
        updateValues.push(value);
        return `${key} = $${updateValues.length}`;
      });
    
    const sql = `
      UPDATE ${table}
      SET ${updates.join(', ')}
      WHERE ${conditions.join(' AND ')}
      RETURNING *
    `;
    
    return this.query(sql, updateValues);
  }

  async delete(table: string, where: any) {
    const conditions = Object.entries(where)
      .map(([key, value], index) => `${key} = $${index + 1}`);
    const values = Object.values(where);
    
    const sql = `DELETE FROM ${table} WHERE ${conditions.join(' AND ')}`;
    
    return this.query(sql, values);
  }
}

export const postgres = new PostgresAPI();