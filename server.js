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

// Carriers endpoint
app.get('/rest/v1/carriers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM carriers ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching carriers:', error);
    res.status(500).json({ error: error.message });
  }
});

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
app.get('/rest/v1/policies', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM policies ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ error: error.message });
  }
});

// Commissions endpoint
app.get('/rest/v1/commissions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM commissions ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching commissions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Expenses endpoint
app.get('/rest/v1/expenses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM expenses ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: error.message });
  }
});

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