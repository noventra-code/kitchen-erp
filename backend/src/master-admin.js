const express = require('express');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const router = express.Router();

const mainPool = new Pool({
  host: process.env.MAIN_DB_HOST || 'localhost',
  port: process.env.MAIN_DB_PORT || 5432,
  database: process.env.MAIN_DB_NAME || 'kitchen_erp_main',
  user: process.env.MAIN_DB_USER || 'erp_admin',
  password: process.env.MAIN_DB_PASSWORD || 'erp_secure_password_123',
});

// Helper to create tenant database
async function createTenantDatabase(dbName) {
  const { Client } = require('pg');
  const client = new Client({
    host: process.env.MAIN_DB_HOST || 'localhost',
    port: process.env.MAIN_DB_PORT || 5432,
    user: process.env.MAIN_DB_USER || 'erp_admin',
    password: process.env.MAIN_DB_PASSWORD || 'erp_secure_password_123',
    database: 'postgres'
  });
  await client.connect();
  try {
    const check = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (check.rows.length === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await client.end();
  }
}

// GET /api/master/tenants - list tenants with optional search
router.get('/tenants', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM tenants';
    let params = [];
    if (search) {
      query += ' WHERE name ILIKE $1 OR db_name ILIKE $1 OR contact_email ILIKE $1';
      params.push(`%${search}%`);
    }
    query += ' ORDER BY created_at DESC';
    const result = await mainPool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/master/tenants - create tenant
router.post('/tenants', async (req, res) => {
  try {
    const { name, contact_first_name, contact_last_name, address_street, address_city, address_state, address_zip, contact_email, contact_phone, status } = req.body;
    
    // Generate unique db_name with tenant_ prefix
    let baseDbName = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    // Ensure it starts with a letter (PostgreSQL requirement)
    if (/^[0-9]/.test(baseDbName)) {
      baseDbName = 'tenant_' + baseDbName;
    }
    // Add tenant_ prefix if not already present
    if (!baseDbName.startsWith('tenant_')) {
      baseDbName = 'tenant_' + baseDbName;
    }
    let dbName = baseDbName;
    let suffix = 0;
    while (true) {
      const exists = await mainPool.query('SELECT 1 FROM tenants WHERE db_name = $1', [dbName]);
      if (exists.rows.length === 0) break;
      suffix++;
      dbName = `${baseDbName}_${suffix}`;
    }
    
    // Create database
    await createTenantDatabase(dbName);
    
    const result = await mainPool.query(
      `INSERT INTO tenants (name, db_name, contact_first_name, contact_last_name, address_street, address_city, address_state, address_zip, contact_email, contact_phone, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [name, dbName, contact_first_name, contact_last_name, address_street, address_city, address_state, address_zip, contact_email, contact_phone, status || 'active']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/master/tenants/:id - update tenant
router.put('/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_first_name, contact_last_name, address_street, address_city, address_state, address_zip, contact_email, contact_phone, status } = req.body;
    
    const result = await mainPool.query(
      `UPDATE tenants
       SET name = $1, contact_first_name = $2, contact_last_name = $3, address_street = $4, address_city = $5, address_state = $6, address_zip = $7, contact_email = $8, contact_phone = $9, status = $10
       WHERE id = $11
       RETURNING *`,
      [name, contact_first_name, contact_last_name, address_street, address_city, address_state, address_zip, contact_email, contact_phone, status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/master/tenants/:id - delete tenant
router.delete('/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await mainPool.query('DELETE FROM tenants WHERE id = $1', [id]);
    res.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/master/tenant-admins - list tenant admins
router.get('/tenant-admins', async (req, res) => {
  try {
    const result = await mainPool.query(`
      SELECT u.*, 
             json_agg(json_build_object('tenant_id', tu.tenant_id, 'tenant_name', t.name)) as tenants
      FROM users u
      LEFT JOIN tenant_users tu ON u.id = tu.user_id
      LEFT JOIN tenants t ON tu.tenant_id = t.id
      WHERE u.role = 'tenant_admin'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tenant admins:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/master/tenant-admins - create tenant admin
router.post('/tenant-admins', async (req, res) => {
  try {
    const { first_name, last_name, email, password, tenant_ids } = req.body;
    
    const password_hash = await bcrypt.hash(password, 10);
    
    const userResult = await mainPool.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name)
       VALUES ($1, $2, 'tenant_admin', $3, $4)
       RETURNING *`,
      [email, password_hash, first_name, last_name]
    );
    
    const user = userResult.rows[0];
    
    if (tenant_ids && Array.isArray(tenant_ids)) {
      for (const tenantId of tenant_ids) {
        await mainPool.query(
          `INSERT INTO tenant_users (user_id, tenant_id, role)
           VALUES ($1, $2, 'tenant_admin')
           ON CONFLICT (user_id, tenant_id) DO NOTHING`,
          [user.id, tenantId]
        );
      }
    }
    
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating tenant admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/master/users - list users with optional role filter
router.get('/users', async (req, res) => {
  try {
    const { role } = req.query;
    let query = 'SELECT id, email, first_name, last_name, role FROM users WHERE 1=1';
    const params = [];
    if (role) {
      query += ' AND role = $1';
      params.push(role);
    }
    query += ' ORDER BY created_at DESC';
    const result = await mainPool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/master/tenants/:id/assign-admin - assign a user as tenant admin
router.post('/tenants/:id/assign-admin', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    
    // Verify tenant exists
    const tenantCheck = await mainPool.query('SELECT * FROM tenants WHERE id = $1', [id]);
    if (tenantCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    // Verify user exists and is tenant_admin role
    const userCheck = await mainPool.query('SELECT * FROM users WHERE id = $1 AND role = $2', [user_id, 'tenant_admin']);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found or not a tenant admin' });
    }
    
    // Assign user to tenant (insert or update)
    await mainPool.query(
      `INSERT INTO tenant_users (user_id, tenant_id, role)
       VALUES ($1, $2, 'tenant_admin')
       ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = 'tenant_admin'`,
      [user_id, id]
    );
    
    res.json({ message: 'Admin assigned successfully' });
  } catch (error) {
    console.error('Error assigning admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
