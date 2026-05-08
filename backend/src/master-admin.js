const express = require('express');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const mainPool = new Pool({
  host: process.env.MAIN_DB_HOST || 'kitchen-erp-main-db',
  port: process.env.MAIN_DB_PORT || 5432,
  database: process.env.MAIN_DB_NAME || 'kitchen_erp_main',
  user: process.env.MAIN_DB_USER || 'erp_admin',
  password: process.env.MAIN_DB_PASSWORD || 'erp_secure_password_123',
});

// Helper to create tenant database
async function createTenantDatabase(dbName) {
  const { Client } = require('pg');
  const client = new Client({
    host: process.env.MAIN_DB_HOST || 'kitchen-erp-main-db',
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

// Helper to run tenant init.sql on new database
async function initializeTenantDatabase(dbName) {
  const initSqlPath = path.join(__dirname, '../database/tenant/init.sql');
  const initSql = fs.readFileSync(initSqlPath, 'utf8');
  
  const { Client } = require('pg');
  const client = new Client({
    host: process.env.MAIN_DB_HOST || 'kitchen-erp-main-db',
    port: process.env.MAIN_DB_PORT || 5432,
    user: process.env.MAIN_DB_USER || 'erp_admin',
    password: process.env.MAIN_DB_PASSWORD || 'erp_secure_password_123',
    database: dbName
  });
  await client.connect();
  try {
    await client.query(initSql);
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

// POST /api/master/tenants - create tenant with full provisioning
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

    // Insert tenant into main DB
    const result = await mainPool.query(
      `INSERT INTO tenants (name, db_name, contact_first_name, contact_last_name, address_street, address_city, address_state, address_zip, contact_email, contact_phone, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [name, dbName, contact_first_name, contact_last_name, address_street, address_city, address_state, address_zip, contact_email, contact_phone, status || 'active']
    );

    const tenant = result.rows[0];

    // Initialize tenant database with init.sql
    await initializeTenantDatabase(dbName);

    // Example: Create initial SuperAdmin membership for the creating user (assumes SuperAdmin is authenticated)
    // In production, you'd get the authenticated user ID from JWT
    // For now, skip or add optional admin_user_id in request body

    res.status(201).json(tenant);
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

// DELETE /api/master/tenants/:id - delete tenant (and drop DB?)
router.delete('/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Get db_name first to drop DB (optional)
    const tenant = await mainPool.query('SELECT db_name FROM tenants WHERE id = $1', [id]);
    if (tenant.rows.length > 0) {
      const dbName = tenant.rows[0].db_name;
      // Drop database (optional, be careful!)
      // await mainPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    }
    await mainPool.query('DELETE FROM tenants WHERE id = $1', [id]);
    res.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/master/users - list users with optional role filter (via memberships)
router.get('/users', async (req, res) => {
  try {
    const { role } = req.query;
    let query = `
      SELECT u.id, u.email, u.first_name, u.last_name, 
             json_agg(json_build_object('tenant_id', m.tenant_id, 'role', m.role, 'tenant_name', t.name)) as memberships
      FROM users u
      LEFT JOIN memberships m ON u.id = m.user_id
      LEFT JOIN tenants t ON m.tenant_id = t.id
    `;
    const params = [];
    if (role) {
      query += ' WHERE m.role = $1';
      params.push(role);
    }
    query += ' GROUP BY u.id ORDER BY u.created_at DESC';
    const result = await mainPool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/master/invite - invite user to tenant (create membership)
router.post('/invite', async (req, res) => {
  try {
    const { email, tenant_id, role } = req.body;
    
    // Check if user exists, if not create them
    let userResult = await mainPool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      // Create new user with temporary password (or send setup email)
      const tempPassword = Math.random().toString(36).slice(-8);
      const password_hash = await bcrypt.hash(tempPassword, 10);
      userResult = await mainPool.query(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *`,
        [email, password_hash]
      );
    }
    const user = userResult.rows[0];

    // Create membership
    const membershipResult = await mainPool.query(
      `INSERT INTO memberships (user_id, tenant_id, role) VALUES ($1, $2, $3) RETURNING *`,
      [user.id, tenant_id, role]
    );

    // Send onboarding email (stub: <under construction>)
    // TODO: Implement actual email sending
    console.log(`Onboarding email to ${email}: <under construction>`);

    res.status(201).json(membershipResult.rows[0]);
  } catch (error) {
    console.error('Error inviting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
