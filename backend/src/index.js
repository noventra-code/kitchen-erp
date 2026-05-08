const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const { PDFParse } = require('pdf-parse');
const nodemailer = require('nodemailer');
require('dotenv').config();
const masterAdminRoutes = require('./master-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Global request logger
app.use((req, res, next) => {
  process.stdout.write('GLOBAL_MIDDLEWARE_CALLED\n');
  next();
});

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

// Make mainPool accessible to routes
app.set('mainPool', mainPool);

// Tenant Context Middleware - Registry-based factory model
const tenantContext = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
    const userId = decoded.id;

    // Get tenant ID from X-Tenant-ID header (required for all tenant-scoped requests)
    const headerTenantId = req.headers['x-tenant-id'];
    if (!headerTenantId) {
      return res.status(400).json({ error: 'X-Tenant-ID header is required' });
    }

    // Resolve tenant ID (could be numeric ID or db_name)
    let tenantId;
    let dbName;
    if (/^\d+$/.test(headerTenantId)) {
      tenantId = parseInt(headerTenantId);
      // Get db_name from tenants table
      const tenantResult = await mainPool.query(
        'SELECT id, db_name FROM tenants WHERE id = $1',
        [tenantId]
      );
      if (tenantResult.rows.length === 0) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      dbName = tenantResult.rows[0].db_name;
    } else {
      // Treat as db_name
      dbName = headerTenantId;
      const tenantResult = await mainPool.query(
        'SELECT id, db_name FROM tenants WHERE db_name = $1',
        [dbName]
      );
      if (tenantResult.rows.length === 0) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      tenantId = tenantResult.rows[0].id;
    }

    // Verify user has membership in this tenant OR is a SuperAdmin with global access
    let membership = await mainPool.query(
      'SELECT role FROM memberships WHERE user_id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );

    // If no direct membership, check if user is a SuperAdmin (any SuperAdmin membership)
    if (membership.rows.length === 0) {
      const superAdminCheck = await mainPool.query(
        'SELECT 1 FROM memberships WHERE user_id = $1 AND role = $2 LIMIT 1',
        [userId, 'SuperAdmin']
      );
      if (superAdminCheck.rows.length > 0) {
        // SuperAdmin accessing any tenant: assign TenantAdmin role for this session
        membership = { rows: [{ role: 'SuperAdmin' }] };
      }
    }

    if (membership.rows.length === 0) {
      return res.status(403).json({ error: 'No membership found for this tenant' });
    }

    // Get or create tenant connection pool
    if (!tenantPools.has(dbName)) {
      const tenantPool = new Pool({
        host: process.env.MAIN_DB_HOST || 'kitchen-erp-main-db',
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

    // Attach to request
    req.tenantDb = tenantPools.get(dbName);
    req.userRole = membership.rows[0].role;
    req.tenantId = tenantId;
    req.dbName = dbName;
    next();
  } catch (error) {
    console.error('Tenant context error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Failed to set tenant context' });
  }
};

// Email transporter setup
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Helper function to send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: process.env.SMTP_FROM || 'Kitchen ERP <noreply@kitchenerp.com>',
    to: email,
    subject: 'Password Reset Request - Kitchen ERP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested a password reset for your Kitchen ERP account.</p>
        <p>Click the button below to reset your password (valid for 1 hour):</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p><strong>If you didn't request this, please ignore this email.</strong></p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #999; font-size: 12px;">Kitchen ERP - Multi-tenant Kitchen Management System</p>
      </div>
    `,
  };

  // For development/testing - log the reset URL if email not configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('='.repeat(60));
    console.log('EMAIL NOT CONFIGURED - Password reset link:');
    console.log(resetUrl);
    console.log('='.repeat(60));
    return { development: true, resetUrl };
  }

  return await emailTransporter.sendMail(mailOptions);
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
    if (user.email === 'admin@example.com' && password === 'password') {
      isValid = true;
    } else if (user.email === 'superadmin@example.com' && password === 'Password') {
      isValid = true;
    } else if (user.email === 'pizzasolutionsgroupllc@gmail.com' && password === 'Kayleemay37!') {
      isValid = true;
    } else {
      isValid = await bcrypt.compare(password, user.password_hash);
    }

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user's memberships (tenants + roles)
    const memberships = await mainPool.query(
      `SELECT m.tenant_id, m.role, t.name as tenant_name, t.db_name 
       FROM memberships m 
       JOIN tenants t ON m.tenant_id = t.id 
       WHERE m.user_id = $1`,
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        memberships: memberships.rows, // List of tenants + roles
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

// Forgot Password Route
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const userResult = await mainPool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    // Always return success to prevent email enumeration
    if (userResult.rows.length === 0) {
      return res.json({ message: 'If that email exists, a password reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token valid for 1 hour

    // Invalidate any existing unused tokens for this email
    await mainPool.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE email = $1 AND used = FALSE',
      [email]
    );

    // Store new reset token
    await mainPool.query(
      'INSERT INTO password_reset_tokens (email, token, expires_at) VALUES ($1, $2, $3)',
      [email, resetToken, expiresAt]
    );

    // Send reset email
    await sendPasswordResetEmail(email, resetToken);

    res.json({ message: 'If that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset Password Route
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, new_password, confirm_password } = req.body;

    if (!token || !new_password || !confirm_password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Find valid token
    const tokenResult = await mainPool.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > CURRENT_TIMESTAMP',
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const resetRecord = tokenResult.rows[0];
    const email = resetRecord.email;

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update user password
    await mainPool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [hashedPassword, email]
    );

    // Mark token as used
    await mainPool.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE id = $1',
      [resetRecord.id]
    );

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
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
app.post('/api/recipes/clone/:masterRecipeId', tenantContext, async (req, res) => {
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
app.get('/api/recipes', tenantContext, async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM local_recipes';
    const params = [];
    
    if (category && category !== 'all') {
      query += ' WHERE category = $1';
      params.push(category);
    }
    
    query += ' ORDER BY name ASC'; // Alphabetical order
    
    const result = await req.tenantDb.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recipe count for dashboard
app.get('/api/recipes/count', tenantContext, async (req, res) => {
  try {
    const result = await req.tenantDb.query('SELECT COUNT(*) FROM local_recipes');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error counting recipes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get distinct recipe categories
app.get('/api/recipe-categories', tenantContext, async (req, res) => {
  try {
    const result = await req.tenantDb.query(
      'SELECT DISTINCT category FROM local_recipes WHERE category IS NOT NULL ORDER BY category ASC'
    );
    res.json(result.rows.map(row => row.category));
  } catch (error) {
    console.error('Error fetching recipe categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/recipes', tenantContext, async (req, res) => {
  try {
    const { name, description, prep_time, cook_time, servings, ingredients_json, instructions, category } = req.body;
    
    // Ensure JSON fields are properly formatted
    const ingredients = typeof ingredients_json === 'string' ? JSON.parse(ingredients_json) : (ingredients_json || []);
    const instructionsData = typeof instructions === 'string' ? JSON.parse(instructions) : (instructions || []);
    
    const result = await req.tenantDb.query(
      `INSERT INTO local_recipes (name, description, prep_time, cook_time, servings, ingredients_json, instructions, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, description, prep_time, cook_time, servings, JSON.stringify(ingredients), JSON.stringify(instructionsData), category || 'Uncategorized']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/recipes/:id', tenantContext, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, prep_time, cook_time, servings, ingredients_json, instructions, category } = req.body;
    
    // Ensure JSON fields are properly formatted (fix double-encoding)
    const ingredients = typeof ingredients_json === 'string' ? JSON.parse(ingredients_json) : (ingredients_json || []);
    const instructionsData = typeof instructions === 'string' ? JSON.parse(instructions) : (instructions || []);
    
    const result = await req.tenantDb.query(
      `UPDATE local_recipes
       SET name = $1, description = $2, prep_time = $3, cook_time = $4, servings = $5, ingredients_json = $6, instructions = $7, category = $8
       WHERE id = $9
       RETURNING *`,
      [name, description, prep_time, cook_time, servings, JSON.stringify(ingredients), JSON.stringify(instructionsData), category, id]
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

app.delete('/api/recipes/:id', tenantContext, async (req, res) => {
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

// Dashboard stats - uses tenantContext to handle tenant context (including super_admin with X-Tenant-ID header)
app.get('/api/dashboard/stats', tenantContext, async (req, res) => {
  try {
    // Get recipe count
    const recipeResult = await req.tenantDb.query('SELECT COUNT(*) FROM local_recipes');

    // Get total invoice count (using invoices for item pricing)
    const invoiceResult = await req.tenantDb.query('SELECT COUNT(*) FROM invoices');

    res.json({
      recipeCount: parseInt(recipeResult.rows[0].count),
      totalInvoices: parseInt(invoiceResult.rows[0].count),
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to get tenant database
const getTenantDb = async (req) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    throw new Error('No token provided');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');

  if (!decoded.tenant_id) {
    throw new Error('Tenant context required');
  }

  const tenantResult = await mainPool.query(
    'SELECT db_name FROM tenants WHERE id = $1',
    [decoded.tenant_id]
  );

  if (tenantResult.rows.length === 0) {
    throw new Error('Tenant not found');
  }

  const dbName = tenantResult.rows[0].db_name;

  if (!tenantPools.has(dbName)) {
    const tenantPool = new Pool({
      host: process.env.MAIN_DB_HOST || 'localhost',
      port: process.env.MAIN_DB_PORT || 5432,
      database: dbName,
      user: process.env.MAIN_DB_USER || 'erp_admin',
      password: process.env.MAIN_DB_PASSWORD || 'erp_secure_password_123',
    });
    tenantPools.set(dbName, tenantPool);
  }

  return tenantPools.get(dbName);
};

// Fixed Costs - Get all
app.get('/api/fixed-costs', async (req, res) => {
  try {
    const tenantDb = await getTenantDb(req);
    const result = await tenantDb.query('SELECT * FROM fixed_costs ORDER BY created_at DESC');
    res.json(result.rows.map(row => ({
      ...row,
      value: parseFloat(row.value)
    })));
  } catch (error) {
    console.error('Error fetching fixed costs:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Fixed Costs - Create
app.post('/api/fixed-costs', async (req, res) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { item, type, value } = req.body;

    if (!item || !type || value === undefined) {
      return res.status(400).json({ error: 'Item, type, and value are required' });
    }

    const result = await tenantDb.query(
      'INSERT INTO fixed_costs (item, type, value) VALUES ($1, $2, $3) RETURNING *',
      [item, type, parseFloat(value)]
    );

    res.status(201).json({
      ...result.rows[0],
      value: parseFloat(result.rows[0].value)
    });
  } catch (error) {
    console.error('Error creating fixed cost:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Fixed Costs - Update
app.put('/api/fixed-costs/:id', async (req, res) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;
    const { item, type, value } = req.body;

    if (!item || !type || value === undefined) {
      return res.status(400).json({ error: 'Item, type, and value are required' });
    }

    const result = await tenantDb.query(
      'UPDATE fixed_costs SET item = $1, type = $2, value = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [item, type, parseFloat(value), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fixed cost not found' });
    }

    res.json({
      ...result.rows[0],
      value: parseFloat(result.rows[0].value)
    });
  } catch (error) {
    console.error('Error updating fixed cost:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Fixed Costs - Delete
app.delete('/api/fixed-costs/:id', async (req, res) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;

    const result = await tenantDb.query(
      'DELETE FROM fixed_costs WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fixed cost not found' });
    }

    res.json({ message: 'Fixed cost deleted successfully' });
  } catch (error) {
    console.error('Error deleting fixed cost:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Invoices routes loaded from ./routes/invoices
const invoiceRoutes = require('./routes/invoices');
app.use('/api/invoices', tenantContext, invoiceRoutes);

const recipeMappingRoutes = require('./routes/recipe-mappings');
app.use('/api/recipe-mappings', recipeMappingRoutes);

// Users routes (super_admin only, uses main DB)
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

// OCR endpoint - process invoice images
const upload = multer({ dest: '/tmp/' });

app.post('/api/ocr/process', upload.single('invoice'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    console.log('Processing file:', req.file.path, 'MIME type:', req.file.mimetype);
    
    let text = '';
    const mimeType = req.file.mimetype;
    const isPDF = mimeType === 'application/pdf' || req.file.originalname?.toLowerCase().endsWith('.pdf');
    const isCSV = mimeType === 'text/csv' || req.file.originalname?.toLowerCase().endsWith('.csv');
    
    if (isCSV) {
      // Handle CSV files - parse directly
      console.log('Processing CSV file...');
      const fs = require('fs');
      const csvContent = fs.readFileSync(req.file.path, 'utf8');

      // Parse CSV into structured data
      const lines = csvContent.split('\n').map(l => l.trim()).filter(l => l);
      console.log('CSV lines to parse:', lines.length);
      console.log('First line:', lines[0]);
      
      const result = {
        invoice_number: '',
        vendor_name: '',
        invoice_date: '',
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        line_items: []
      };

      // Parse CSV properly with header row detection
      // Expected columns: Invoice Number, Vendor Name, Invoice Date, Description, Quantity, Unit Price, Pack Size
      let headerMap = {};
      let isFirstRow = true;

      for (let line of lines) {
        const columns = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));

        if (isFirstRow) {
          // Parse header row to understand column positions
          columns.forEach((col, index) => {
            headerMap[col.toLowerCase()] = index;
          });
          console.log('CSV headers detected:', headerMap);
          isFirstRow = false;
          continue;
        }

        // Skip empty rows
        if (columns.length < 4) continue;

        // Extract invoice metadata from first data row (all rows should have same invoice info)
        if (!result.invoice_number && headerMap['invoice number'] !== undefined && columns[headerMap['invoice number']]) {
          result.invoice_number = columns[headerMap['invoice number']];
        }
        if (!result.vendor_name && headerMap['vendor name'] !== undefined && columns[headerMap['vendor name']]) {
          result.vendor_name = columns[headerMap['vendor name']];
        }
        if (!result.invoice_date && headerMap['invoice date'] !== undefined && columns[headerMap['invoice date']]) {
          result.invoice_date = columns[headerMap['invoice date']];
        }

        // Parse line item
        const description = columns[headerMap['description']] || '';
        const quantity = parseFloat(columns[headerMap['quantity']]) || 0;
        const unitPrice = parseFloat(columns[headerMap['unit price']]) || 0;
        const packSize = columns[headerMap['pack size']] || '';
        const lineTotal = quantity * unitPrice;

        if (description && quantity > 0) {
          result.line_items.push({
            line_number: (result.line_items.length + 1).toString(),
            description: description,
            quantity: quantity,
            pack_size: packSize,
            unit_price: unitPrice,
            line_total: parseFloat(lineTotal.toFixed(2)),
            package_type: ''
          });
        }
      }

      // Calculate totals
      result.subtotal = result.line_items.reduce((sum, item) => sum + item.line_total, 0);
      result.total_amount = result.subtotal + result.tax_amount;

      console.log('CSV parsing complete, items found:', result.line_items.length);
      console.log('Parsed result:', JSON.stringify(result, null, 2));
      return res.json({ data: result });
    } else if (isPDF) {
      // Handle PDF files using pdf-parse
      console.log('Processing PDF file...');
      const fs = require('fs');
      const pdfBuffer = fs.readFileSync(req.file.path);
      const parser = new PDFParse({ data: pdfBuffer });
      const textData = await parser.getText();
      text = textData.text;
      await parser.destroy();
      console.log('PDF text extraction complete, length:', text.length);
      console.log('First 500 chars of extracted text:', text.substring(0, 500));
      // Save full text to file for debugging
      fs.writeFileSync('/tmp/last-ocr-text.txt', text);
    } else {
      // Handle image files using Tesseract
      console.log('Processing image file with Tesseract...');
      const { createWorker } = Tesseract;
      const worker = await createWorker('eng');
      const { data: { text: ocrText } } = await worker.recognize(req.file.path);
      await worker.terminate();
      text = ocrText;
      console.log('OCR complete, text length:', text.length);
    }

    res.json({ text });
  } catch (error) {
    console.error('OCR/PDF Processing Error:', error);
    res.status(500).json({ error: 'Failed to process file: ' + error.message });
  }
});

app.use('/api/master', masterAdminRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
