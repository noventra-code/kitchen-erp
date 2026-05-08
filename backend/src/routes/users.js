const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT and ensure super_admin access
function requireSuperAdmin(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
    
    if (decoded.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// GET /api/users - list all users (main DB)
router.get('/', requireSuperAdmin, async (req, res) => {
  try {
    const mainPool = req.app.get('mainPool');
    const result = await mainPool.query(`
      SELECT 
        u.id, 
        u.email, 
        u.role, 
        u.tenant_id,
        u.created_at,
        t.name as tenant_name
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      ORDER BY u.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users - create new user
router.post('/', requireSuperAdmin, async (req, res) => {
  try {
    const { email, password, role, tenant_id } = req.body;
    
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }
    
    const mainPool = req.app.get('mainPool');
    
    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    
    const result = await mainPool.query(
      `INSERT INTO users (email, password_hash, role, tenant_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, role, tenant_id, created_at`,
      [email, password_hash, role, tenant_id || null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/:id - update user
router.put('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role, tenant_id } = req.body;
    
    const mainPool = req.app.get('mainPool');
    const result = await mainPool.query(
      `UPDATE users 
       SET email = COALESCE($1, email), 
           role = COALESCE($2, role), 
           tenant_id = COALESCE($3, tenant_id)
       WHERE id = $4
       RETURNING id, email, role, tenant_id, created_at`,
      [email, role, tenant_id, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/:id - delete user
router.delete('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const mainPool = req.app.get('mainPool');
    const result = await mainPool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
