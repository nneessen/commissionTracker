// Simple Express server to handle database requests locally
import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const PORT = 3001;

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'commission_tracker',
  user: 'postgres',
  password: 'password',
});

app.use(cors());
app.use(express.json());

// Test connection
pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch(err => console.error('❌ Database connection error:', err));

// Generic endpoint handler with query support
const createTableHandler = (tableName, defaultOrder = 'id ASC') => {
  return async (req, res) => {
    try {
      let query = `SELECT * FROM ${tableName}`;
      const params = [];
      const whereConditions = [];
      let paramCount = 0;

      // Handle filters from query parameters
      Object.keys(req.query).forEach(key => {
        if (key.includes('.')) {
          const [column, operator] = key.split('.');
          paramCount++;

          switch(operator) {
            case 'eq':
              whereConditions.push(`${column} = $${paramCount}`);
              params.push(req.query[key]);
              break;
            case 'neq':
              whereConditions.push(`${column} != $${paramCount}`);
              params.push(req.query[key]);
              break;
            case 'gt':
              whereConditions.push(`${column} > $${paramCount}`);
              params.push(req.query[key]);
              break;
            case 'gte':
              whereConditions.push(`${column} >= $${paramCount}`);
              params.push(req.query[key]);
              break;
            case 'lt':
              whereConditions.push(`${column} < $${paramCount}`);
              params.push(req.query[key]);
              break;
            case 'lte':
              whereConditions.push(`${column} <= $${paramCount}`);
              params.push(req.query[key]);
              break;
            case 'like':
              whereConditions.push(`${column} LIKE $${paramCount}`);
              params.push(req.query[key]);
              break;
            case 'ilike':
              whereConditions.push(`${column} ILIKE $${paramCount}`);
              params.push(req.query[key]);
              break;
            case 'is':
              if (req.query[key] === 'null') {
                whereConditions.push(`${column} IS NULL`);
              } else {
                whereConditions.push(`${column} IS NOT NULL`);
              }
              break;
            case 'in':
              const values = req.query[key].replace(/[()]/g, '').split(',');
              const placeholders = values.map((_, i) => `$${paramCount + i}`).join(',');
              whereConditions.push(`${column} IN (${placeholders})`);
              params.push(...values);
              paramCount += values.length - 1;
              break;
          }
        }
      });

      // Apply WHERE clause
      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      // Handle ordering
      if (req.query.order) {
        const orderBy = req.query.order.split(',')
          .map(o => {
            const [col, dir] = o.split('.');
            return `${col} ${dir === 'desc' ? 'DESC' : 'ASC'}`;
          })
          .join(', ');
        query += ` ORDER BY ${orderBy}`;
      } else {
        query += ` ORDER BY ${defaultOrder}`;
      }

      // Handle pagination
      if (req.query.limit) {
        query += ` LIMIT ${parseInt(req.query.limit)}`;
      }
      if (req.query.offset) {
        query += ` OFFSET ${parseInt(req.query.offset)}`;
      }

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error(`Error fetching ${tableName}:`, error);
      res.status(500).json({ error: error.message });
    }
  };
};

// Carriers endpoint
app.get('/rest/v1/carriers', createTableHandler('carriers', 'name ASC'));

// Constants endpoint
app.get('/rest/v1/constants', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM constants');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching constants:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generic query endpoint for other operations
app.post('/rest/v1/rpc/exec', async (req, res) => {
  try {
    const { sql, params = [] } = req.body;
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ error: error.message });
  }
});

// Policies endpoint
app.get('/rest/v1/policies', createTableHandler('policies', 'created_at DESC'));

// Commissions endpoint
app.get('/rest/v1/commissions', createTableHandler('commissions', 'created_at DESC'));

// Expenses endpoint
app.get('/rest/v1/expenses', createTableHandler('expenses', 'created_at DESC'));

// Agent Settings endpoints
app.get('/rest/v1/agent_settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM agent_settings ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching agent settings:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/rest/v1/agent_settings', async (req, res) => {
  try {
    const { agent_name, agent_code, appointment_date, email, phone, contract_level, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO agent_settings (agent_name, agent_code, appointment_date, email, phone, contract_level, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [agent_name, agent_code, appointment_date, email, phone, contract_level, notes]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating agent settings:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/rest/v1/agent_settings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { agent_name, agent_code, appointment_date, email, phone, contract_level, notes } = req.body;
    const result = await pool.query(
      `UPDATE agent_settings
       SET agent_name = $2, agent_code = $3, appointment_date = $4, email = $5,
           phone = $6, contract_level = $7, notes = $8, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, agent_name, agent_code, appointment_date, email, phone, contract_level, notes]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent settings not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating agent settings:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/rest/v1/agent_settings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM agent_settings WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent settings not found' });
    }
    res.json({ message: 'Agent settings deleted successfully' });
  } catch (error) {
    console.error('Error deleting agent settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Products endpoints
app.get('/rest/v1/products', createTableHandler('products', 'name ASC'));

app.post('/rest/v1/products', async (req, res) => {
  try {
    const { name, type, carrier_id } = req.body;
    const result = await pool.query(
      `INSERT INTO products (name, type, carrier_id, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [name, type, carrier_id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/rest/v1/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, carrier_id } = req.body;
    const result = await pool.query(
      `UPDATE products
       SET name = $2, type = $3, carrier_id = $4, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, name, type, carrier_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/rest/v1/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Agents endpoints
app.get('/rest/v1/agents', createTableHandler('agents', 'name ASC'));

app.post('/rest/v1/agents', async (req, res) => {
  try {
    const { name, code, email, phone } = req.body;
    const result = await pool.query(
      `INSERT INTO agents (name, code, email, phone, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [name, code, email, phone]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/rest/v1/agents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, email, phone } = req.body;
    const result = await pool.query(
      `UPDATE agents
       SET name = $2, code = $3, email = $4, phone = $5, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, name, code, email, phone]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/rest/v1/agents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM agents WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Commission Guide endpoints with pagination
app.get('/rest/v1/comp_guide', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const carrier = req.query.carrier || '';
    const product = req.query.product || '';
    const contractLevel = req.query.contract_level || '';

    let whereConditions = [];
    let params = [];
    let paramCount = 0;

    // Add search conditions
    if (search) {
      paramCount++;
      whereConditions.push(`(
        carrier_name ILIKE $${paramCount} OR
        product_name ILIKE $${paramCount} OR
        product_type ILIKE $${paramCount}
      )`);
      params.push(`%${search}%`);
    }

    if (carrier) {
      paramCount++;
      whereConditions.push(`carrier_name = $${paramCount}`);
      params.push(carrier);
    }

    if (product) {
      paramCount++;
      whereConditions.push(`product_name = $${paramCount}`);
      params.push(product);
    }

    if (contractLevel) {
      paramCount++;
      whereConditions.push(`contract_level = $${paramCount}`);
      params.push(contractLevel);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM comp_guide ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalItems / limit);

    // Get paginated results
    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);

    const result = await pool.query(
      `SELECT * FROM comp_guide
       ${whereClause}
       ORDER BY carrier_name ASC, product_name ASC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching comp guide:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`);
  console.log(`📊 Database: PostgreSQL on localhost:5432`);
  console.log(`🔧 pgAdmin: http://localhost:8080`);
});