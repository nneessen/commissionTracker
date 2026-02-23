// Simple Express server to handle database requests locally
// TODO: can this file be deleted now since we're using supabase entirely?
import express from "express";
import cors from "cors";
import pg from "pg";

const { Pool } = pg;
const app = express();
const PORT = 3001;

// Database connection
const pool = new Pool({
  host: "localhost",
  port: 54322,
  database: "postgres",
  user: "postgres",
  password: "postgres",
});

app.use(cors());
app.use(express.json());

// Test connection
pool
  .connect()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch((err) => console.error("❌ Database connection error:", err));

// Generic endpoint handler with query support
const createTableHandler = (tableName, defaultOrder = "id ASC") => {
  return async (req, res) => {
    try {
      let query = `SELECT * FROM ${tableName}`;
      const params = [];
      const whereConditions = [];
      let paramCount = 0;

      // Handle filters from query parameters
      Object.keys(req.query).forEach((key) => {
        if (key.includes(".")) {
          const [column, operator] = key.split(".");
          paramCount++;

          switch (operator) {
            case "eq":
              whereConditions.push(`${column} = $${paramCount}`);
              params.push(req.query[key]);
              break;
            case "neq":
              whereConditions.push(`${column} != $${paramCount}`);
              params.push(req.query[key]);
              break;
            case "gt":
              whereConditions.push(`${column} > $${paramCount}`);
              params.push(req.query[key]);
              break;
            case "gte":
              whereConditions.push(`${column} >= $${paramCount}`);
              params.push(req.query[key]);
              break;
            case "lt":
              whereConditions.push(`${column} < $${paramCount}`);
              params.push(req.query[key]);
              break;
            case "lte":
              whereConditions.push(`${column} <= $${paramCount}`);
              params.push(req.query[key]);
              break;
            case "like":
              whereConditions.push(`${column} LIKE $${paramCount}`);
              params.push(req.query[key]);
              break;
            case "ilike":
              whereConditions.push(`${column} ILIKE $${paramCount}`);
              params.push(req.query[key]);
              break;
            case "is":
              if (req.query[key] === "null") {
                whereConditions.push(`${column} IS NULL`);
              } else {
                whereConditions.push(`${column} IS NOT NULL`);
              }
              break;
            case "in":
              const values = req.query[key].replace(/[()]/g, "").split(",");
              const placeholders = values
                .map((_, i) => `$${paramCount + i}`)
                .join(",");
              whereConditions.push(`${column} IN (${placeholders})`);
              params.push(...values);
              paramCount += values.length - 1;
              break;
          }
        }
      });

      // Apply WHERE clause
      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(" AND ")}`;
      }

      // Handle ordering
      if (req.query.order) {
        const orderBy = req.query.order
          .split(",")
          .map((o) => {
            const [col, dir] = o.split(".");
            return `${col} ${dir === "desc" ? "DESC" : "ASC"}`;
          })
          .join(", ");
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
app.get("/rest/v1/constants", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM constants");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching constants:", error);
    res.status(500).json({ error: error.message });
  }
});

// Generic query endpoint for other operations
app.post("/rest/v1/rpc/exec", async (req, res) => {
  try {
    const { sql, params = [] } = req.body;
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ error: error.message });
  }
});

// Policies endpoint
app.get("/rest/v1/policies", createTableHandler("policies", "created_at DESC"));

// Commissions endpoint
app.get(
  "/rest/v1/commissions",
  createTableHandler("commissions", "created_at DESC"),
);

// Expenses endpoint
app.get("/rest/v1/expenses", createTableHandler("expenses", "created_at DESC"));

// Products endpoint - map to comp_guide table
app.get(
  "/rest/v1/products",
  createTableHandler("comp_guide", "carrier_name ASC, product_name ASC"),
);

// Comp Guide endpoint
app.get(
  "/rest/v1/comp_guide",
  createTableHandler(
    "comp_guide",
    "carrier_name ASC, product_name ASC, contract_level ASC",
  ),
);

// Carriers endpoint
app.get("/rest/v1/carriers", createTableHandler("carriers", "name ASC"));

// PUT endpoint for carriers update
app.put("/rest/v1/carriers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = [];
    const values = [];
    let paramCount = 1;

    // Map frontend fields to database columns
    const fieldMapping = {
      name: "name",
      short_name: "short_name",
      is_active: "is_active",
      default_commission_rates: "commission_rates",
      commission_rates: "commission_rates",
      contact_info: "contact_info",
      notes: "notes",
    };

    // Build dynamic update query with field mapping
    Object.keys(req.body).forEach((key) => {
      if (key !== "id" && req.body[key] !== undefined && fieldMapping[key]) {
        const dbColumn = fieldMapping[key];
        updates.push(`${dbColumn} = $${paramCount++}`);
        // Handle JSON fields
        if (
          key === "default_commission_rates" ||
          key === "commission_rates" ||
          key === "contact_info"
        ) {
          values.push(JSON.stringify(req.body[key]));
        } else {
          values.push(req.body[key]);
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `
      UPDATE carriers
      SET ${updates.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Carrier not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating carrier:", error);
    res.status(500).json({ error: error.message });
  }
});

// Constants endpoint
app.get("/rest/v1/constants", createTableHandler("constants", "id ASC"));

// Agents endpoint
app.get("/rest/v1/agents", createTableHandler("agents", "name ASC"));

app.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`);
  console.log(`📊 Database: PostgreSQL on localhost:54322`);
  console.log(`🔧 pgAdmin: http://localhost:8080`);
});
