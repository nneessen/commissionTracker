// src/api/servicesRouter.js
import express from "express";

// Router factory function that accepts the database pool
export default function createServicesRouter(pool) {
  const router = express.Router();

  // Helper function to handle async route handlers
  const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  // =============================================================================
  // CARRIERS ROUTES - Enhanced CRUD
  // =============================================================================

  // GET /carriers - Get all carriers
  router.get(
    "/carriers",
    asyncHandler(async (req, res) => {
      try {
        const result = await pool.query(`
        SELECT id, name, is_active, commission_rates, created_at, updated_at
        FROM carriers
        ORDER BY name ASC
      `);
        res.json(result.rows);
      } catch (error) {
        console.error("Error fetching carriers:", error);
        res.status(500).json({ error: error.message });
      }
    }),
  );

  // GET /carriers/:id - Get carrier by ID
  router.get(
    "/carriers/:id",
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const result = await pool.query(
          `
        SELECT id, name, is_active, commission_rates, created_at, updated_at
        FROM carriers
        WHERE id = $1
      `,
          [id],
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: "Carrier not found" });
        }

        res.json(result.rows[0]);
      } catch (error) {
        console.error("Error fetching carrier:", error);
        res.status(500).json({ error: error.message });
      }
    }),
  );

  // POST /carriers - Create new carrier
  router.post(
    "/carriers",
    asyncHandler(async (req, res) => {
      try {
        const { name, is_active = true, commission_rates = {} } = req.body;

        if (!name) {
          return res.status(400).json({ error: "Name is required" });
        }

        const result = await pool.query(
          `
        INSERT INTO carriers (name, is_active, commission_rates)
        VALUES ($1, $2, $3)
        RETURNING id, name, is_active, commission_rates, created_at, updated_at
      `,
          [name, is_active, JSON.stringify(commission_rates)],
        );

        res.status(201).json(result.rows[0]);
      } catch (error) {
        console.error("Error creating carrier:", error);
        if (error.code === "23505") {
          // Unique violation
          res.status(400).json({ error: "Carrier name already exists" });
        } else {
          res.status(500).json({ error: error.message });
        }
      }
    }),
  );

  // PUT /carriers/:id - Update carrier
  router.put(
    "/carriers/:id",
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const { name, is_active, commission_rates } = req.body;

        const updates = [];
        const values = [];
        let paramCount = 1;

        if (name !== undefined) {
          updates.push(`name = $${paramCount++}`);
          values.push(name);
        }
        if (is_active !== undefined) {
          updates.push(`is_active = $${paramCount++}`);
          values.push(is_active);
        }
        if (commission_rates !== undefined) {
          updates.push(`commission_rates = $${paramCount++}`);
          values.push(JSON.stringify(commission_rates));
        }

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
        RETURNING id, name, is_active, commission_rates, created_at, updated_at
      `,
          values,
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: "Carrier not found" });
        }

        res.json(result.rows[0]);
      } catch (error) {
        console.error("Error updating carrier:", error);
        if (error.code === "23505") {
          // Unique violation
          res.status(400).json({ error: "Carrier name already exists" });
        } else {
          res.status(500).json({ error: error.message });
        }
      }
    }),
  );

  // DELETE /carriers/:id - Delete carrier
  router.delete(
    "/carriers/:id",
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;

        const result = await pool.query(
          `
        DELETE FROM carriers
        WHERE id = $1
        RETURNING id
      `,
          [id],
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: "Carrier not found" });
        }

        res.json({ message: "Carrier deleted successfully" });
      } catch (error) {
        console.error("Error deleting carrier:", error);
        res.status(500).json({ error: error.message });
      }
    }),
  );

  // =============================================================================
  // AGENTS ROUTES - Enhanced CRUD
  // =============================================================================

  // GET /agents - Get all agents
  router.get(
    "/agents",
    asyncHandler(async (req, res) => {
      try {
        const result = await pool.query(`
        SELECT id, name, email, contract_comp_level, is_active, created_at, updated_at
        FROM agents
        ORDER BY name ASC
      `);
        res.json(result.rows);
      } catch (error) {
        console.error("Error fetching agents:", error);
        res.status(500).json({ error: error.message });
      }
    }),
  );

  // POST /agents - Create new agent
  router.post(
    "/agents",
    asyncHandler(async (req, res) => {
      try {
        const {
          name,
          email,
          contract_comp_level = 100,
          is_active = true,
        } = req.body;

        if (!name) {
          return res.status(400).json({ error: "Name is required" });
        }

        if (
          contract_comp_level < 80 ||
          contract_comp_level > 145 ||
          contract_comp_level % 5 !== 0
        ) {
          return res
            .status(400)
            .json({
              error: "Contract level must be between 80-145 in increments of 5",
            });
        }

        const result = await pool.query(
          `
        INSERT INTO agents (name, email, contract_comp_level, is_active)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, email, contract_comp_level, is_active, created_at, updated_at
      `,
          [name, email, contract_comp_level, is_active],
        );

        res.status(201).json(result.rows[0]);
      } catch (error) {
        console.error("Error creating agent:", error);
        if (error.code === "23505") {
          // Unique violation
          res.status(400).json({ error: "Agent email already exists" });
        } else {
          res.status(500).json({ error: error.message });
        }
      }
    }),
  );

  // PUT /agents/:id - Update agent
  router.put(
    "/agents/:id",
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const { name, email, contract_comp_level, is_active } = req.body;

        const updates = [];
        const values = [];
        let paramCount = 1;

        if (name !== undefined) {
          updates.push(`name = $${paramCount++}`);
          values.push(name);
        }
        if (email !== undefined) {
          updates.push(`email = $${paramCount++}`);
          values.push(email);
        }
        if (contract_comp_level !== undefined) {
          if (
            contract_comp_level < 80 ||
            contract_comp_level > 145 ||
            contract_comp_level % 5 !== 0
          ) {
            return res
              .status(400)
              .json({
                error:
                  "Contract level must be between 80-145 in increments of 5",
              });
          }
          updates.push(`contract_comp_level = $${paramCount++}`);
          values.push(contract_comp_level);
        }
        if (is_active !== undefined) {
          updates.push(`is_active = $${paramCount++}`);
          values.push(is_active);
        }

        if (updates.length === 0) {
          return res.status(400).json({ error: "No fields to update" });
        }

        updates.push(`updated_at = NOW()`);
        values.push(id);

        const result = await pool.query(
          `
        UPDATE agents
        SET ${updates.join(", ")}
        WHERE id = $${paramCount}
        RETURNING id, name, email, contract_comp_level, is_active, created_at, updated_at
      `,
          values,
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: "Agent not found" });
        }

        res.json(result.rows[0]);
      } catch (error) {
        console.error("Error updating agent:", error);
        if (error.code === "23505") {
          // Unique violation
          res.status(400).json({ error: "Agent email already exists" });
        } else {
          res.status(500).json({ error: error.message });
        }
      }
    }),
  );

  // DELETE /agents/:id - Delete agent
  router.delete(
    "/agents/:id",
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;

        const result = await pool.query(
          `
        DELETE FROM agents
        WHERE id = $1
        RETURNING id
      `,
          [id],
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: "Agent not found" });
        }

        res.json({ message: "Agent deleted successfully" });
      } catch (error) {
        console.error("Error deleting agent:", error);
        res.status(500).json({ error: error.message });
      }
    }),
  );

  // =============================================================================
  // Enhanced COMP_GUIDE routes with CRUD operations
  // =============================================================================

  // GET /comp_guide - Get all commission guide entries
  router.get(
    "/comp_guide",
    asyncHandler(async (req, res) => {
      try {
        const result = await pool.query(`
        SELECT id, carrier_name, product_name, contract_level, commission_percentage, created_at, updated_at
        FROM comp_guide
        ORDER BY carrier_name ASC, product_name ASC, contract_level ASC
      `);
        res.json(result.rows);
      } catch (error) {
        console.error("Error fetching commission guide entries:", error);
        res.status(500).json({ error: error.message });
      }
    }),
  );

  // GET /comp_guide/:id - Get commission guide entry by ID
  router.get(
    "/comp_guide/:id",
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const result = await pool.query(
          `
        SELECT id, carrier_name, product_name, contract_level, commission_percentage, created_at, updated_at
        FROM comp_guide
        WHERE id = $1
      `,
          [id],
        );

        if (result.rows.length === 0) {
          return res
            .status(404)
            .json({ error: "Commission guide entry not found" });
        }

        res.json(result.rows[0]);
      } catch (error) {
        console.error("Error fetching commission guide entry:", error);
        res.status(500).json({ error: error.message });
      }
    }),
  );

  // POST /comp_guide - Create new comp guide entry
  router.post(
    "/comp_guide",
    asyncHandler(async (req, res) => {
      try {
        const {
          carrier_name,
          product_name,
          contract_level,
          commission_percentage,
          first_year_percentage,
          renewal_percentage,
          trail_percentage,
          effective_date = new Date().toISOString().split("T")[0],
          expiration_date,
          is_active = true,
          notes,
        } = req.body;

        if (
          !carrier_name ||
          !product_name ||
          !contract_level ||
          commission_percentage === undefined
        ) {
          return res.status(400).json({
            error:
              "carrier_name, product_name, contract_level, and commission_percentage are required",
          });
        }

        if (
          contract_level < 80 ||
          contract_level > 145 ||
          contract_level % 5 !== 0
        ) {
          return res
            .status(400)
            .json({
              error: "Contract level must be between 80-145 in increments of 5",
            });
        }

        const result = await pool.query(
          `
        INSERT INTO comp_guide (carrier_name, product_name, contract_level, commission_percentage,
                               first_year_percentage, renewal_percentage, trail_percentage,
                               effective_date, expiration_date, is_active, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `,
          [
            carrier_name,
            product_name,
            contract_level,
            commission_percentage,
            first_year_percentage,
            renewal_percentage,
            trail_percentage,
            effective_date,
            expiration_date,
            is_active,
            notes,
          ],
        );

        res.status(201).json(result.rows[0]);
      } catch (error) {
        console.error("Error creating comp guide entry:", error);
        if (error.code === "23505") {
          // Unique violation
          res
            .status(400)
            .json({
              error:
                "Commission guide entry already exists for this combination",
            });
        } else {
          res.status(500).json({ error: error.message });
        }
      }
    }),
  );

  // PUT /comp_guide/:id - Update comp guide entry
  router.put(
    "/comp_guide/:id",
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const {
          carrier_name,
          product_name,
          contract_level,
          commission_percentage,
          first_year_percentage,
          renewal_percentage,
          trail_percentage,
          effective_date,
          expiration_date,
          is_active,
          notes,
        } = req.body;

        const updates = [];
        const values = [];
        let paramCount = 1;

        if (carrier_name !== undefined) {
          updates.push(`carrier_name = $${paramCount++}`);
          values.push(carrier_name);
        }
        if (product_name !== undefined) {
          updates.push(`product_name = $${paramCount++}`);
          values.push(product_name);
        }
        if (contract_level !== undefined) {
          if (
            contract_level < 80 ||
            contract_level > 145 ||
            contract_level % 5 !== 0
          ) {
            return res
              .status(400)
              .json({
                error:
                  "Contract level must be between 80-145 in increments of 5",
              });
          }
          updates.push(`contract_level = $${paramCount++}`);
          values.push(contract_level);
        }
        if (commission_percentage !== undefined) {
          updates.push(`commission_percentage = $${paramCount++}`);
          values.push(commission_percentage);
        }
        if (first_year_percentage !== undefined) {
          updates.push(`first_year_percentage = $${paramCount++}`);
          values.push(first_year_percentage);
        }
        if (renewal_percentage !== undefined) {
          updates.push(`renewal_percentage = $${paramCount++}`);
          values.push(renewal_percentage);
        }
        if (trail_percentage !== undefined) {
          updates.push(`trail_percentage = $${paramCount++}`);
          values.push(trail_percentage);
        }
        if (effective_date !== undefined) {
          updates.push(`effective_date = $${paramCount++}`);
          values.push(effective_date);
        }
        if (expiration_date !== undefined) {
          updates.push(`expiration_date = $${paramCount++}`);
          values.push(expiration_date);
        }
        if (is_active !== undefined) {
          updates.push(`is_active = $${paramCount++}`);
          values.push(is_active);
        }
        if (notes !== undefined) {
          updates.push(`notes = $${paramCount++}`);
          values.push(notes);
        }

        if (updates.length === 0) {
          return res.status(400).json({ error: "No fields to update" });
        }

        updates.push(`updated_at = NOW()`);
        values.push(id);

        const result = await pool.query(
          `
        UPDATE comp_guide
        SET ${updates.join(", ")}
        WHERE id = $${paramCount}
        RETURNING *
      `,
          values,
        );

        if (result.rows.length === 0) {
          return res
            .status(404)
            .json({ error: "Commission guide entry not found" });
        }

        res.json(result.rows[0]);
      } catch (error) {
        console.error("Error updating comp guide entry:", error);
        if (error.code === "23505") {
          // Unique violation
          res
            .status(400)
            .json({
              error:
                "Commission guide entry already exists for this combination",
            });
        } else {
          res.status(500).json({ error: error.message });
        }
      }
    }),
  );

  // DELETE /comp_guide/:id - Delete comp guide entry
  router.delete(
    "/comp_guide/:id",
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;

        const result = await pool.query(
          `
        DELETE FROM comp_guide
        WHERE id = $1
        RETURNING id
      `,
          [id],
        );

        if (result.rows.length === 0) {
          return res
            .status(404)
            .json({ error: "Commission guide entry not found" });
        }

        res.json({ message: "Commission guide entry deleted successfully" });
      } catch (error) {
        console.error("Error deleting comp guide entry:", error);
        res.status(500).json({ error: error.message });
      }
    }),
  );

  // =============================================================================
  // ERROR HANDLER
  // =============================================================================

  // Global error handler for the services router
  router.use((error, req, res, next) => {
    console.error("Services Router Error:", error);
    res.status(500).json({
      error: "Internal server error",
      success: false,
      ...(process.env.NODE_ENV === "development" && { details: error.message }),
    });
  });

  return router;
}

