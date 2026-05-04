const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
const masterAdminRoutes = require('./master-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Main Database Pool (for tenant/user lookup)
const mainPool = new Pool({
  host: process.env.MAIN_DB_HOST || 'localhost',
  port: process.env.MAIN_DB_PORT || 5432,
  database: process.env.MAIN_DB_NAME || 'kitchen_erp_main',
  user: process.env.MAIN_DB_USER || 'erp_admin',
  password: process.env.MAIN_DB_PASSWORD || 'erp_secure_password_123',
});

// Tenant Connection Cache
const tenantPools = new Map();

// Tenant Middleware - identifies tenant and creates/retrieves connection
const tenantMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
    req.user = decoded;

    // Get tenant database name from main DB
    const tenantResult = await mainPool.query(
      'SELECT db_name FROM tenants WHERE id = $1',
      [decoded.tenant_id]
    );

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const dbName = tenantResult.rows[0].db_name;

    // Check if we have a pool for this tenant
    if (!tenantPools.has(dbName)) {
      const tenantPool = new Pool({
        host: process.env.MAIN_DB_HOST || 'localhost',
        port: process.env.MAIN_DB_PORT || 5432,
        database: dbName,
        user: process.env.MAIN_DB_USER || 'erp_admin',
        password: process.env.MAIN_DB_PASSWORD || 'erp_secure_password_123',
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
      tenantPools.set(dbName, tenantPool);
    }

    req.tenantDb = tenantPools.get(dbName);
    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    return res.status(401).json({ error: 'Invalid token or tenant lookup failed' });
  }
};

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await mainPool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    // Temporary: Allow plain text passwords for demo users
    let isValid;
    if (user.email === 'admin@example.com' && password === 'password123') {
      isValid = true;
    } else if (user.email === 'superadmin@example.com' && password === 'Password') {
      isValid = true;
    } else {
      isValid = await bcrypt.compare(password, user.password_hash);
    }

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, tenant_id: user.tenant_id, role: user.role },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change Password Route
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { email, current_password, new_password, confirm_password } = req.body;

    if (!email || !current_password || !new_password || !confirm_password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get user from main DB
    const result = await mainPool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Verify current password
    let isValid;
    if (user.email === 'admin@example.com' && current_password === 'password') {
      isValid = true;
    } else if (user.email === 'superadmin@example.com' && current_password === 'Password') {
      isValid = true;
    } else {
      isValid = await bcrypt.compare(current_password, user.password_hash);
    }

    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password in database
    await mainPool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [hashedPassword, email]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Master Recipes Routes (from main DB)
app.get('/api/master-recipes', async (req, res) => {
  try {
    const result = await mainPool.query(
      'SELECT * FROM master_recipes WHERE is_public = true ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching master recipes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clone master recipe to tenant DB
app.post('/api/recipes/clone/:masterRecipeId', tenantMiddleware, async (req, res) => {
  try {
    const { masterRecipeId } = req.params;

    // Get master recipe from main DB
    const masterResult = await mainPool.query(
      'SELECT * FROM master_recipes WHERE id = $1',
      [masterRecipeId]
    );

    if (masterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Master recipe not found' });
    }

    const masterRecipe = masterResult.rows[0];

    // Clone to tenant DB
    const insertResult = await req.tenantDb.query(
      `INSERT INTO local_recipes 
       (master_recipe_id, name, description, prep_time, cook_time, servings, ingredients_json, instructions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        masterRecipe.id,
        masterRecipe.name,
        masterRecipe.description,
        masterRecipe.prep_time,
        masterRecipe.cook_time,
        masterRecipe.servings,
        masterRecipe.ingredients_json,
        masterRecipe.instructions,
      ]
    );

    res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    console.error('Clone recipe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Tenant-specific recipe routes
app.get('/api/recipes', tenantMiddleware, async (req, res) => {
  try {
    const result = await req.tenantDb.query(
      'SELECT * FROM local_recipes ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/recipes', tenantMiddleware, async (req, res) => {
  try {
    const { name, description, prep_time, cook_time, servings, ingredients_json, instructions } = req.body;
    const result = await req.tenantDb.query(
      `INSERT INTO local_recipes (name, description, prep_time, cook_time, servings, ingredients_json, instructions)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, description, prep_time, cook_time, servings, ingredients_json, instructions]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/recipes/:id', tenantMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, prep_time, cook_time, servings, ingredients_json, instructions } = req.body;
    const result = await req.tenantDb.query(
      `UPDATE local_recipes
       SET name = $1, description = $2, prep_time = $3, cook_time = $4, servings = $5, ingredients_json = $6, instructions = $7
       WHERE id = $8
       RETURNING *`,
      [name, description, prep_time, cook_time, servings, ingredients_json, instructions, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating recipe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/recipes/:id', tenantMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await req.tenantDb.query(
      'DELETE FROM local_recipes WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========== INVOICES ROUTES (Tenant DB) ==========
app.get('/api/invoices', tenantMiddleware, async (req, res) => {
  try {
    const result = await req.tenantDb.query(
      'SELECT * FROM invoices ORDER BY invoice_date DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/invoices', tenantMiddleware, async (req, res) => {
  try {
    const { vendor, amount, invoice_date, due_date, status, description } = req.body;
    const result = await req.tenantDb.query(
      `INSERT INTO invoices (vendor, amount, invoice_date, due_date, status, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [vendor, amount, invoice_date, due_date, status || 'pending', description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/invoices/:id', tenantMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { vendor, amount, invoice_date, due_date, status, description } = req.body;
    const result = await req.tenantDb.query(
      `UPDATE invoices
       SET vendor = $1, amount = $2, invoice_date = $3, due_date = $4, status = $5, description = $6
       WHERE id = $7
       RETURNING *`,
      [vendor, amount, invoice_date, due_date, status, description, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/invoices/:id', tenantMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await req.tenantDb.query(
      'DELETE FROM invoices WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== INGREDIENTS ROUTES (Tenant DB) ==========
app.get('/api/ingredients', tenantMiddleware, async (req, res) => {
  try {
    const result = await req.tenantDb.query(
      'SELECT * FROM ingredients ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/ingredients', tenantMiddleware, async (req, res) => {
  try {
    const { name, unit, current_price, supplier } = req.body;
    const result = await req.tenantDb.query(
      `INSERT INTO ingredients (name, unit, current_price, supplier)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, unit, current_price, supplier]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating ingredient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/ingredients/:id', tenantMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, unit, current_price, supplier } = req.body;
    const result = await req.tenantDb.query(
      `UPDATE ingredients
       SET name = $1, unit = $2, current_price = $3, supplier = $4
       WHERE id = $5
       RETURNING *`,
      [name, unit, current_price, supplier, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating ingredient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/ingredients/:id', tenantMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await req.tenantDb.query(
      'DELETE FROM ingredients WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    res.json({ message: 'Ingredient deleted successfully' });
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use('/api/master', masterAdminRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
