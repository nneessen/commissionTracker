// Simple Express server to handle database requests locally
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import createServicesRouter from './src/api/servicesRouter.js';

const { Pool } = pg;
const app = express();
const PORT = 3001;

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
});

app.use(cors());
app.use(express.json());

// Test connection
pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch(err => console.error('❌ Database connection error:', err));

// Use comprehensive services router for carriers, agents, and comp_guide
app.use('/api/services', createServicesRouter(pool));

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

app.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`);
  console.log(`📊 Database: PostgreSQL on localhost:54322`);
  console.log(`🔧 pgAdmin: http://localhost:8080`);
});