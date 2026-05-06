# Invoice Section Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build an invoice management system allowing manual input and PDF/image upload with parsing, plus a recipe-to-line-item mapping page for cost analysis.

**Architecture:** Multi-tenant aware (using existing tenant middleware). Invoices stored in tenant databases. File uploads handled via multer. Parsing logic will be a placeholder until user provides sample invoice. Recipe mapping stored in tenant DB to link invoice items to recipes for cost calculation.

**Tech Stack:** Node.js 25, Express, PostgreSQL 15, React 18, Vite, multer (file upload), pdf-parse or tesseract.js (parsing - to be decided after sample)

---

## Phase 1: Database Schema

### Task 1: Create invoices table migration

**Objective:** Create the invoices table in tenant databases

**Files:**
- Create: `backend/src/migrations/001_create_invoices_table.sql`

**Step 1: Write the migration SQL**

```sql
-- backend/src/migrations/001_create_invoices_table.sql
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(255) NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processed, mapped
    file_url TEXT, -- path to uploaded PDF/image
    raw_parsed_data JSONB, -- store raw parsed data for debugging
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_vendor ON invoices(vendor_name);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_status ON invoices(status);
```

**Step 2: Verify SQL syntax**

Run: `psql -U erp_admin -d kitchen_erp_tenant_1 -f backend/src/migrations/001_create_invoices_table.sql`
Expected: `CREATE TABLE` output

**Step 3: Commit**

```bash
git add backend/src/migrations/001_create_invoices_table.sql
git commit -m "feat: add invoices table migration"
```

---

### Task 2: Create invoice_line_items table migration

**Objective:** Create line items table for invoice details

**Files:**
- Create: `backend/src/migrations/002_create_invoice_line_items_table.sql`

**Step 1: Write the migration SQL**

```sql
-- backend/src/migrations/002_create_invoice_line_items_table.sql
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    line_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    recipe_id INTEGER REFERENCES recipes(id), -- nullable, for mapping
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_line_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX idx_line_items_recipe ON invoice_line_items(recipe_id);
```

**Step 2: Verify SQL syntax**

Run: `psql -U erp_admin -d kitchen_erp_tenant_1 -f backend/src/migrations/002_create_invoice_line_items_table.sql`
Expected: `CREATE TABLE` output

**Step 3: Commit**

```bash
git add backend/src/migrations/002_create_invoice_line_items_table.sql
git commit -m "feat: add invoice_line_items table migration"
```

---

### Task 3: Create recipe_mappings table migration

**Objective:** Create mapping table to link invoice line items to recipes

**Files:**
- Create: `backend/src/migrations/003_create_recipe_mappings_table.sql`

**Step 1: Write the migration SQL**

```sql
-- backend/src/migrations/003_create_recipe_mappings_table.sql
CREATE TABLE IF NOT EXISTS recipe_mappings (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL, -- for multi-tenant isolation in main DB
    invoice_vendor VARCHAR(255) NOT NULL,
    invoice_item_pattern VARCHAR(255) NOT NULL, -- pattern/regex to match line item
    recipe_id INTEGER NOT NULL REFERENCES recipes(id),
    confidence_score DECIMAL(3,2) DEFAULT 1.00, -- 0.00 to 1.00
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(invoice_vendor, invoice_item_pattern, recipe_id)
);

CREATE INDEX idx_mappings_tenant ON recipe_mappings(tenant_id);
CREATE INDEX idx_mappings_vendor ON recipe_mappings(invoice_vendor);
```

**Note:** This table lives in the MAIN database (not tenant DB) because mappings are shared across all tenants of the same parent.

**Step 2: Verify SQL syntax**

Run: `psql -U erp_admin -d kitchen_erp_main -f backend/src/migrations/003_create_recipe_mappings_table.sql`
Expected: `CREATE TABLE` output

**Step 3: Commit**

```bash
git add backend/src/migrations/003_create_recipe_mappings_table.sql
git commit -m "feat: add recipe_mappings table migration"
```

---

## Phase 2: Backend Models

### Task 4: Create Invoice model

**Objective:** Build Invoice model with CRUD operations

**Files:**
- Create: `backend/src/models/Invoice.js`

**Step 1: Write the Invoice model**

```javascript
// backend/src/models/Invoice.js
class Invoice {
  constructor(tenantDb) {
    this.db = tenantDb;
  }

  async create(invoiceData) {
    const {
      invoice_number,
      vendor_name,
      invoice_date,
      due_date,
      subtotal,
      tax_amount,
      total_amount,
      file_url,
      raw_parsed_data
    } = invoiceData;

    const result = await this.db.query(
      `INSERT INTO invoices 
       (invoice_number, vendor_name, invoice_date, due_date, subtotal, tax_amount, total_amount, file_url, raw_parsed_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [invoice_number, vendor_name, invoice_date, due_date, subtotal, tax_amount, total_amount, file_url, raw_parsed_data]
    );
    return result.rows[0];
  }

  async findAll(filters = {}) {
    let query = 'SELECT * FROM invoices WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND status = $${paramCount++}`;
      params.push(filters.status);
    }

    if (filters.vendor_name) {
      query += ` AND vendor_name ILIKE $${paramCount++}`;
      params.push(`%${filters.vendor_name}%`);
    }

    query += ' ORDER BY invoice_date DESC';
    const result = await this.db.query(query, params);
    return result.rows;
  }

  async findById(id) {
    const result = await this.db.query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async update(id, invoiceData) {
    const {
      invoice_number,
      vendor_name,
      invoice_date,
      due_date,
      subtotal,
      tax_amount,
      total_amount,
      status
    } = invoiceData;

    const result = await this.db.query(
      `UPDATE invoices 
       SET invoice_number = $1, vendor_name = $2, invoice_date = $3, due_date = $4,
           subtotal = $5, tax_amount = $6, total_amount = $7, status = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [invoice_number, vendor_name, invoice_date, due_date, subtotal, tax_amount, total_amount, status, id]
    );
    return result.rows[0];
  }

  async delete(id) {
    const result = await this.db.query(
      'DELETE FROM invoices WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }
}

module.exports = Invoice;
```

**Step 2: Test model loads**

Run: `node -e "const Invoice = require('./backend/src/models/Invoice.js'); console.log('Invoice model loaded');"`
Expected: `Invoice model loaded`

**Step 3: Commit**

```bash
git add backend/src/models/Invoice.js
git commit -m "feat: add Invoice model with CRUD operations"
```

---

### Task 5: Create InvoiceLineItem model

**Objective:** Build line items model

**Files:**
- Create: `backend/src/models/InvoiceLineItem.js`

**Step 1: Write the InvoiceLineItem model**

```javascript
// backend/src/models/InvoiceLineItem.js
class InvoiceLineItem {
  constructor(tenantDb) {
    this.db = tenantDb;
  }

  async create(lineItemData) {
    const {
      invoice_id,
      description,
      quantity,
      unit_price,
      line_total,
      recipe_id
    } = lineItemData;

    const result = await this.db.query(
      `INSERT INTO invoice_line_items 
       (invoice_id, description, quantity, unit_price, line_total, recipe_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [invoice_id, description, quantity, unit_price, line_total, recipe_id]
    );
    return result.rows[0];
  }

  async findByInvoiceId(invoice_id) {
    const result = await this.db.query(
      'SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY id',
      [invoice_id]
    );
    return result.rows;
  }

  async update(id, lineItemData) {
    const { description, quantity, unit_price, line_total, recipe_id } = lineItemData;
    const result = await this.db.query(
      `UPDATE invoice_line_items 
       SET description = $1, quantity = $2, unit_price = $3, line_total = $4, recipe_id = $5
       WHERE id = $6
       RETURNING *`,
      [description, quantity, unit_price, line_total, recipe_id, id]
    );
    return result.rows[0];
  }

  async delete(id) {
    const result = await this.db.query(
      'DELETE FROM invoice_line_items WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  async bulkCreate(lineItems) {
    const created = [];
    for (const item of lineItems) {
      const result = await this.create(item);
      created.push(result);
    }
    return created;
  }
}

module.exports = InvoiceLineItem;
```

**Step 2: Test model loads**

Run: `node -e "const InvoiceLineItem = require('./backend/src/models/InvoiceLineItem.js'); console.log('LineItem model loaded');"`
Expected: `LineItem model loaded`

**Step 3: Commit**

```bash
git add backend/src/models/InvoiceLineItem.js
git commit -m "feat: add InvoiceLineItem model with CRUD operations"
```

---

## Phase 3: File Upload Setup

### Task 6: Install multer for file uploads

**Objective:** Add multer dependency for handling file uploads

**Files:**
- Modify: `backend/package.json` (add dependency)
- Create: `backend/src/middleware/upload.js`

**Step 1: Install multer**

Run: `cd backend && npm install multer`
Expected: `added 1 package` or similar

**Step 2: Create upload middleware**

```javascript
// backend/src/middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = '/tmp/invoice-uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPEG, PNG, and TIFF allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

module.exports = upload;
```

**Step 3: Commit**

```bash
git add backend/package.json backend/src/middleware/upload.js
git commit -m "feat: add multer for file uploads with PDF/image support"
```

---

## Phase 4: Backend API Routes

### Task 7: Create invoice routes with manual input

**Objective:** Build API endpoints for invoice CRUD + file upload

**Files:**
- Create: `backend/src/routes/invoices.js`

**Step 1: Write invoice routes**

```javascript
// backend/src/routes/invoices.js
const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const InvoiceLineItem = require('../models/InvoiceLineItem');
const upload = require('../middleware/upload');

// Create invoice (manual input)
router.post('/', async (req, res) => {
  try {
    const { invoice, line_items } = req.body;
    const invoiceModel = new Invoice(req.tenantDb);
    const lineItemModel = new InvoiceLineItem(req.tenantDb);

    // Create invoice
    const createdInvoice = await invoiceModel.create(invoice);

    // Create line items if provided
    if (line_items && line_items.length > 0) {
      for (const item of line_items) {
        await lineItemModel.create({
          ...item,
          invoice_id: createdInvoice.id
        });
      }
    }

    res.status(201).json({ 
      message: 'Invoice created successfully',
      invoice: createdInvoice 
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all invoices
router.get('/', async (req, res) => {
  try {
    const invoiceModel = new Invoice(req.tenantDb);
    const invoices = await invoiceModel.findAll(req.query);
    res.json(invoices);
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get invoice by ID with line items
router.get('/:id', async (req, res) => {
  try {
    const invoiceModel = new Invoice(req.tenantDb);
    const lineItemModel = new InvoiceLineItem(req.tenantDb);

    const invoice = await invoiceModel.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const lineItems = await lineItemModel.findByInvoiceId(req.params.id);
    res.json({ ...invoice, line_items: lineItems });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update invoice
router.put('/:id', async (req, res) => {
  try {
    const invoiceModel = new Invoice(req.tenantDb);
    const updatedInvoice = await invoiceModel.update(req.params.id, req.body);
    res.json({ 
      message: 'Invoice updated successfully',
      invoice: updatedInvoice 
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    const invoiceModel = new Invoice(req.tenantDb);
    const deletedInvoice = await invoiceModel.delete(req.params.id);
    res.json({ 
      message: 'Invoice deleted successfully',
      invoice: deletedInvoice 
    });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload invoice file (placeholder for parsing)
router.post('/upload', upload.single('invoice'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Placeholder: parsing logic will be added after user provides sample
    const fileInfo = {
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size
    };

    res.json({
      message: 'File uploaded successfully. Parsing will be implemented after sample provided.',
      file: fileInfo
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

**Step 2: Register routes in index.js**

Add to `backend/src/index.js` after other route registrations:

```javascript
const invoiceRoutes = require('./routes/invoices');
app.use('/api/invoices', tenantMiddleware, invoiceRoutes);
```

**Step 3: Commit**

```bash
git add backend/src/routes/invoices.js backend/src/index.js
git commit -m "feat: add invoice API routes with CRUD and file upload"
```

---

## Phase 5: Recipe Mapping Backend

### Task 8: Create RecipeMapping model

**Objective:** Build model for mapping invoice items to recipes

**Files:**
- Create: `backend/src/models/RecipeMapping.js`

**Step 1: Write RecipeMapping model**

```javascript
// backend/src/models/RecipeMapping.js
class RecipeMapping {
  constructor(mainDb) {
    this.db = mainDb;
  }

  async create(mappingData) {
    const { tenant_id, invoice_vendor, invoice_item_pattern, recipe_id, confidence_score } = mappingData;
    const result = await this.db.query(
      `INSERT INTO recipe_mappings 
       (tenant_id, invoice_vendor, invoice_item_pattern, recipe_id, confidence_score)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [tenant_id, invoice_vendor, invoice_item_pattern, recipe_id, confidence_score]
    );
    return result.rows[0];
  }

  async findByTenant(tenant_id) {
    const result = await this.db.query(
      'SELECT * FROM recipe_mappings WHERE tenant_id = $1 ORDER BY invoice_vendor, invoice_item_pattern',
      [tenant_id]
    );
    return result.rows;
  }

  async update(id, mappingData) {
    const { invoice_vendor, invoice_item_pattern, recipe_id, confidence_score } = mappingData;
    const result = await this.db.query(
      `UPDATE recipe_mappings 
       SET invoice_vendor = $1, invoice_item_pattern = $2, recipe_id = $3, confidence_score = $4
       WHERE id = $5
       RETURNING *`,
      [invoice_vendor, invoice_item_pattern, recipe_id, confidence_score, id]
    );
    return result.rows[0];
  }

  async delete(id) {
    const result = await this.db.query(
      'DELETE FROM recipe_mappings WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }
}

module.exports = RecipeMapping;
```

**Step 2: Commit**

```bash
git add backend/src/models/RecipeMapping.js
git commit -m "feat: add RecipeMapping model for invoice-to-recipe mapping"
```

---

### Task 9: Create recipe mapping routes

**Objective:** API endpoints for managing recipe mappings

**Files:**
- Create: `backend/src/routes/recipe-mappings.js`

**Step 1: Write recipe mapping routes**

```javascript
// backend/src/routes/recipe-mappings.js
const express = require('express');
const router = express.Router();
const RecipeMapping = require('../models/RecipeMapping');

// Get all mappings for tenant
router.get('/', async (req, res) => {
  try {
    const mappingModel = new RecipeMapping(req.mainPool || req.tenantDb); // Use main DB
    const mappings = await mappingModel.findByTenant(req.user.tenant_id);
    res.json(mappings);
  } catch (error) {
    console.error('Get mappings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create mapping
router.post('/', async (req, res) => {
  try {
    const { invoice_vendor, invoice_item_pattern, recipe_id, confidence_score } = req.body;
    const mappingModel = new RecipeMapping(req.mainPool || req.tenantDb);
    
    const mapping = await mappingModel.create({
      tenant_id: req.user.tenant_id,
      invoice_vendor,
      invoice_item_pattern,
      recipe_id,
      confidence_score: confidence_score || 1.00
    });

    res.status(201).json({ 
      message: 'Mapping created successfully',
      mapping 
    });
  } catch (error) {
    console.error('Create mapping error:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Mapping already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update mapping
router.put('/:id', async (req, res) => {
  try {
    const mappingModel = new RecipeMapping(req.mainPool || req.tenantDb);
    const mapping = await mappingModel.update(req.params.id, req.body);
    res.json({ 
      message: 'Mapping updated successfully',
      mapping 
    });
  } catch (error) {
    console.error('Update mapping error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete mapping
router.delete('/:id', async (req, res) => {
  try {
    const mappingModel = new RecipeMapping(req.mainPool || req.tenantDb);
    const mapping = await mappingModel.delete(req.params.id);
    res.json({ 
      message: 'Mapping deleted successfully',
      mapping 
    });
  } catch (error) {
    console.error('Delete mapping error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

**Step 2: Register routes in index.js**

Add to `backend/src/index.js`:

```javascript
const recipeMappingRoutes = require('./routes/recipe-mappings');
app.use('/api/recipe-mappings', recipeMappingRoutes);
```

**Step 3: Commit**

```bash
git add backend/src/routes/recipe-mappings.js backend/src/index.js
git commit -m "feat: add recipe mapping API routes"
```

---

## Phase 6: Frontend - Invoice List Page

### Task 10: Create invoice list component

**Objective:** Build UI to display all invoices

**Files:**
- Create: `frontend/src/pages/Invoices.jsx`
- Create: `frontend/src/components/InvoiceList.jsx`

**Step 1: Write InvoiceList component**

```jsx
// frontend/src/components/InvoiceList.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', vendor_name: '' });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams(filters).toString();
      const response = await fetch(`http://localhost:3000/api/invoices?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setInvoices(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchInvoices();
  };

  if (loading) return <div>Loading invoices...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <Link to="/invoices/new" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Add Invoice
        </Link>
      </div>

      {/* Filters */}
      <form onSubmit={handleFilterSubmit} className="mb-6 flex gap-4">
        <input
          type="text"
          name="vendor_name"
          placeholder="Filter by vendor..."
          value={filters.vendor_name}
          onChange={handleFilterChange}
          className="border rounded px-3 py-2"
        />
        <select name="status" value={filters.status} onChange={handleFilterChange} className="border rounded px-3 py-2">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processed">Processed</option>
          <option value="mapped">Mapped</option>
        </select>
        <button type="submit" className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
          Filter
        </button>
      </form>

      {/* Invoice Table */}
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">Invoice #</th>
            <th className="border p-2 text-left">Vendor</th>
            <th className="border p-2 text-left">Date</th>
            <th className="border p-2 text-left">Total</th>
            <th className="border p-2 text-left">Status</th>
            <th className="border p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map(invoice => (
            <tr key={invoice.id} className="hover:bg-gray-50">
              <td className="border p-2">{invoice.invoice_number}</td>
              <td className="border p-2">{invoice.vendor_name}</td>
              <td className="border p-2">{new Date(invoice.invoice_date).toLocaleDateString()}</td>
              <td className="border p-2">${invoice.total_amount.toFixed(2)}</td>
              <td className="border p-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  invoice.status === 'mapped' ? 'bg-green-200' :
                  invoice.status === 'processed' ? 'bg-blue-200' : 'bg-yellow-200'
                }`}>
                  {invoice.status}
                </span>
              </td>
              <td className="border p-2">
                <Link to={`/invoices/${invoice.id}`} className="text-blue-500 hover:underline mr-2">
                  View
                </Link>
                <Link to={`/invoices/${invoice.id}/edit`} className="text-green-500 hover:underline">
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {invoices.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No invoices found. <Link to="/invoices/new" className="text-blue-500">Create one now</Link>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
```

**Step 2: Write Invoices page**

```jsx
// frontend/src/pages/Invoices.jsx
import React from 'react';
import InvoiceList from '../components/InvoiceList';

const Invoices = () => {
  return <InvoiceList />;
};

export default Invoices;
```

**Step 3: Add route in App.jsx**

Add to `frontend/src/App.jsx`:
```jsx
import Invoices from './pages/Invoices';

// Add route
<Route path="/invoices" element={<Invoices />} />
```

**Step 4: Commit**

```bash
git add frontend/src/pages/Invoices.jsx frontend/src/components/InvoiceList.jsx frontend/src/App.jsx
git commit -m "feat: add invoice list page with filters"
```

---

## Phase 7: Frontend - Invoice Create/Upload

### Task 11: Create invoice form component

**Objective:** Build form for manual invoice entry and file upload

**Files:**
- Create: `frontend/src/pages/InvoiceNew.jsx`
- Create: `frontend/src/components/InvoiceForm.jsx`

**Step 1: Write InvoiceForm component**

```jsx
// frontend/src/components/InvoiceForm.jsx
import React, { useState } from 'react';

const InvoiceForm = ({ initialData = {}, onSubmit, submitText = 'Create Invoice' }) => {
  const [formData, setFormData] = useState({
    invoice_number: initialData.invoice_number || '',
    vendor_name: initialData.vendor_name || '',
    invoice_date: initialData.invoice_date || new Date().toISOString().split('T')[0],
    due_date: initialData.due_date || '',
    subtotal: initialData.subtotal || 0,
    tax_amount: initialData.tax_amount || 0,
    total_amount: initialData.total_amount || 0,
    status: initialData.status || 'pending',
    line_items: initialData.line_items || []
  });

  const [file, setFile] = useState(null);
  const [uploadMode, setUploadMode] = useState('manual'); // manual or upload

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleLineItemChange = (index, field, value) => {
    const newLineItems = [...formData.line_items];
    newLineItems[index] = { ...newLineItems[index], [field]: value };
    
    // Recalculate line total
    if (field === 'quantity' || field === 'unit_price') {
      newLineItems[index].line_total = newLineItems[index].quantity * newLineItems[index].unit_price;
    }
    
    setFormData({ ...formData, line_items: newLineItems });
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      line_items: [...formData.line_items, { description: '', quantity: 1, unit_price: 0, line_total: 0 }]
    });
  };

  const removeLineItem = (index) => {
    const newLineItems = formData.line_items.filter((_, i) => i !== index);
    setFormData({ ...formData, line_items: newLineItems });
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (uploadMode === 'upload' && file) {
      // Upload file
      const formDataObj = new FormData();
      formDataObj.append('invoice', file);
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/invoices/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formDataObj
        });
        const data = await response.json();
        alert('File uploaded! Parsing will be implemented after sample provided.');
      } catch (error) {
        console.error('Upload error:', error);
        alert('Upload failed');
      }
    } else {
      // Manual submission
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <label className="inline-flex items-center mr-4">
          <input
            type="radio"
            value="manual"
            checked={uploadMode === 'manual'}
            onChange={(e) => setUploadMode(e.target.value)}
            className="mr-2"
          />
          Manual Entry
        </label>
        <label className="inline-flex items-center">
          <input
            type="radio"
            value="upload"
            checked={uploadMode === 'upload'}
            onChange={(e) => setUploadMode(e.target.value)}
            className="mr-2"
          />
          Upload File (PDF/Image)
        </label>
      </div>

      {uploadMode === 'upload' ? (
        <div className="mb-6">
          <label className="block mb-2">Upload Invoice File</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.tiff"
            onChange={handleFileChange}
            className="border rounded px-3 py-2"
          />
          <p className="text-sm text-gray-500 mt-2">
            Supported formats: PDF, JPEG, PNG, TIFF (max 10MB)
          </p>
          <button type="submit" className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Upload Invoice
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block mb-1">Invoice Number</label>
              <input
                type="text"
                name="invoice_number"
                value={formData.invoice_number}
                onChange={handleChange}
                required
                className="border rounded px-3 py-2 w-full"
              />
            </div>
            <div>
              <label className="block mb-1">Vendor Name</label>
              <input
                type="text"
                name="vendor_name"
                value={formData.vendor_name}
                onChange={handleChange}
                required
                className="border rounded px-3 py-2 w-full"
              />
            </div>
            <div>
              <label className="block mb-1">Invoice Date</label>
              <input
                type="date"
                name="invoice_date"
                value={formData.invoice_date}
                onChange={handleChange}
                required
                className="border rounded px-3 py-2 w-full"
              />
            </div>
            <div>
              <label className="block mb-1">Due Date</label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="border rounded px-3 py-2 w-full"
              />
            </div>
          </div>

          <h3 className="text-lg font-semibold mb-4">Line Items</h3>
          {formData.line_items.map((item, index) => (
            <div key={index} className="grid grid-cols-5 gap-2 mb-2 items-end">
              <input
                type="text"
                placeholder="Description"
                value={item.description}
                onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                className="border rounded px-2 py-1"
              />
              <input
                type="number"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value))}
                className="border rounded px-2 py-1"
              />
              <input
                type="number"
                placeholder="Unit Price"
                value={item.unit_price}
                onChange={(e) => handleLineItemChange(index, 'unit_price', parseFloat(e.target.value))}
                className="border rounded px-2 py-1"
              />
              <input
                type="number"
                placeholder="Line Total"
                value={item.line_total.toFixed(2)}
                readOnly
                className="border rounded px-2 py-1 bg-gray-100"
              />
              <button
                type="button"
                onClick={() => removeLineItem(index)}
                className="text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addLineItem}
            className="mb-4 text-blue-500 hover:text-blue-700"
          >
            + Add Line Item
          </button>

          <div className="mt-6">
            <button
              type="submit"
              className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
            >
              {submitText}
            </button>
          </div>
        </>
      )}
    </form>
  );
};

export default InvoiceForm;
```

**Step 2: Write InvoiceNew page**

```jsx
// frontend/src/pages/InvoiceNew.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import InvoiceForm from '../components/InvoiceForm';

const InvoiceNew = () => {
  const navigate = useNavigate();

  const handleSubmit = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/invoices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoice: {
            invoice_number: formData.invoice_number,
            vendor_name: formData.vendor_name,
            invoice_date: formData.invoice_date,
            due_date: formData.due_date,
            subtotal: formData.subtotal,
            tax_amount: formData.tax_amount,
            total_amount: formData.total_amount
          },
          line_items: formData.line_items
        })
      });

      if (response.ok) {
        alert('Invoice created successfully!');
        navigate('/invoices');
      } else {
        alert('Failed to create invoice');
      }
    } catch (error) {
      console.error('Create invoice error:', error);
      alert('Failed to create invoice');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold p-6 pb-0">Create New Invoice</h1>
      <InvoiceForm onSubmit={handleSubmit} submitText="Create Invoice" />
    </div>
  );
};

export default InvoiceNew;
```

**Step 3: Add route in App.jsx**

Add to `frontend/src/App.jsx`:
```jsx
import InvoiceNew from './pages/InvoiceNew';

<Route path="/invoices/new" element={<InvoiceNew />} />
```

**Step 4: Commit**

```bash
git add frontend/src/pages/InvoiceNew.jsx frontend/src/components/InvoiceForm.jsx frontend/src/App.jsx
git commit -m "feat: add invoice create form with manual entry and file upload"
```

---

## Phase 8: Frontend - Recipe Mapping Page

### Task 12: Create recipe mapping page

**Objective:** Build UI for mapping invoice items to recipes

**Files:**
- Create: `frontend/src/pages/RecipeMappings.jsx`
- Create: `frontend/src/components/RecipeMappingList.jsx`

**Step 1: Write RecipeMappingList component**

```jsx
// frontend/src/components/RecipeMappingList.jsx
import React, { useEffect, useState } from 'react';

const RecipeMappingList = () => {
  const [mappings, setMappings] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    invoice_vendor: '',
    invoice_item_pattern: '',
    recipe_id: '',
    confidence_score: 1.00
  });

  useEffect(() => {
    fetchMappings();
    fetchRecipes();
  }, []);

  const fetchMappings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/recipe-mappings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setMappings(data);
    } catch (error) {
      console.error('Error fetching mappings:', error);
    }
  };

  const fetchRecipes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/recipes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setRecipes(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/recipe-mappings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert('Mapping created successfully!');
        setFormData({
          invoice_vendor: '',
          invoice_item_pattern: '',
          recipe_id: '',
          confidence_score: 1.00
        });
        setShowForm(false);
        fetchMappings();
      }
    } catch (error) {
      console.error('Error creating mapping:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this mapping?')) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:3000/api/recipe-mappings/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchMappings();
    } catch (error) {
      console.error('Error deleting mapping:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Recipe Mappings</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {showForm ? 'Cancel' : 'Add Mapping'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded bg-gray-50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Vendor Name</label>
              <input
                type="text"
                value={formData.invoice_vendor}
                onChange={(e) => setFormData({...formData, invoice_vendor: e.target.value})}
                required
                className="border rounded px-3 py-2 w-full"
                placeholder="e.g., US Foods"
              />
            </div>
            <div>
              <label className="block mb-1">Item Pattern</label>
              <input
                type="text"
                value={formData.invoice_item_pattern}
                onChange={(e) => setFormData({...formData, invoice_item_pattern: e.target.value})}
                required
                className="border rounded px-3 py-2 w-full"
                placeholder="e.g., *chicken* (wildcard match)"
              />
            </div>
            <div>
              <label className="block mb-1">Recipe</label>
              <select
                value={formData.recipe_id}
                onChange={(e) => setFormData({...formData, recipe_id: e.target.value})}
                required
                className="border rounded px-3 py-2 w-full"
              >
                <option value="">Select Recipe</option>
                {recipes.map(recipe => (
                  <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1">Confidence Score</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={formData.confidence_score}
                onChange={(e) => setFormData({...formData, confidence_score: parseFloat(e.target.value)})}
                className="border rounded px-3 py-2 w-full"
              />
            </div>
          </div>
          <button type="submit" className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
            Save Mapping
          </button>
        </form>
      )}

      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">Vendor</th>
            <th className="border p-2 text-left">Item Pattern</th>
            <th className="border p-2 text-left">Recipe</th>
            <th className="border p-2 text-left">Confidence</th>
            <th className="border p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {mappings.map(mapping => (
            <tr key={mapping.id}>
              <td className="border p-2">{mapping.invoice_vendor}</td>
              <td className="border p-2">{mapping.invoice_item_pattern}</td>
              <td className="border p-2">{recipes.find(r => r.id === mapping.recipe_id)?.name || 'Unknown'}</td>
              <td className="border p-2">{mapping.confidence_score}</td>
              <td className="border p-2">
                <button
                  onClick={() => handleDelete(mapping.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {mappings.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No mappings found. Create one to map invoice items to recipes.
        </div>
      )}
    </div>
  );
};

export default RecipeMappingList;
```

**Step 2: Write RecipeMappings page**

```jsx
// frontend/src/pages/RecipeMappings.jsx
import React from 'react';
import RecipeMappingList from '../components/RecipeMappingList';

const RecipeMappings = () => {
  return <RecipeMappingList />;
};

export default RecipeMappings;
```

**Step 3: Add route in App.jsx**

Add to `frontend/src/App.jsx`:
```jsx
import RecipeMappings from './pages/RecipeMappings';

<Route path="/recipe-mappings" element={<RecipeMappings />} />
```

**Step 4: Commit**

```bash
git add frontend/src/pages/RecipeMappings.jsx frontend/src/components/RecipeMappingList.jsx frontend/src/App.jsx
git commit -m "feat: add recipe mapping page with CRUD for invoice-to-recipe mappings"
```

---

## Phase 9: Apply Migrations

### Task 13: Create migration runner script

**Objective:** Apply database migrations to tenant databases

**Files:**
- Create: `backend/src/migrate.js`

**Step 1: Write migration runner**

```javascript
// backend/src/migrate.js
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const mainPool = new Pool({
  host: process.env.MAIN_DB_HOST || 'localhost',
  port: process.env.MAIN_DB_PORT || 5432,
  database: process.env.MAIN_DB_NAME || 'kitchen_erp_main',
  user: process.env.MAIN_DB_USER || 'erp_admin',
  password: process.env.MAIN_DB_PASSWORD || 'erp_secure_password_123',
});

async function runMigrations() {
  try {
    // Get all tenant databases
    const tenants = await mainPool.query('SELECT db_name FROM tenants');
    
    const migrationFiles = fs.readdirSync(path.join(__dirname, 'migrations'))
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const tenant of tenants.rows) {
      const dbName = tenant.db_name;
      console.log(`Running migrations for ${dbName}...`);

      const tenantPool = new Pool({
        host: process.env.MAIN_DB_HOST || 'localhost',
        port: process.env.MAIN_DB_PORT || 5432,
        database: dbName,
        user: process.env.MAIN_DB_USER || 'erp_admin',
        password: process.env.MAIN_DB_PASSWORD || 'erp_secure_password_123',
      });

      for (const file of migrationFiles) {
        console.log(`  Applying ${file}...`);
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', file), 'utf8');
        await tenantPool.query(sql);
      }

      await tenantPool.end();
      console.log(`  Done with ${dbName}`);
    }

    // Also run main DB migrations (for recipe_mappings)
    console.log('Running migrations for main database...');
    const mainDbMigration = migrationFiles.find(f => f.includes('003')); // recipe_mappings
    if (mainDbMigration) {
      const sql = fs.readFileSync(path.join(__dirname, 'migrations', mainDbMigration), 'utf8');
      await mainPool.query(sql);
      console.log('  Done with main database');
    }

    console.log('All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

runMigrations();
```

**Step 2: Run migrations**

Run: `cd backend && node src/migrate.js`
Expected: `All migrations completed successfully!`

**Step 3: Commit**

```bash
git add backend/src/migrate.js
git commit -m "feat: add migration runner for tenant databases"
```

---

## Phase 10: Navigation & Integration

### Task 14: Add invoice navigation to sidebar

**Objective:** Add links to invoice section in the app navigation

**Files:**
- Modify: `frontend/src/components/Sidebar.jsx` (or similar navigation component)

**Step 1: Add navigation links**

```jsx
// Add to sidebar component
<nav>
  <Link to="/invoices" className="block p-2 hover:bg-gray-700">Invoices</Link>
  <Link to="/recipe-mappings" className="block p-2 hover:bg-gray-700">Recipe Mappings</Link>
</nav>
```

**Step 2: Test navigation**

Run: Start frontend with `npm run dev`, navigate to `/invoices`
Expected: Invoice list page loads

**Step 3: Commit**

```bash
git add frontend/src/components/Sidebar.jsx
git commit -m "feat: add invoice and recipe mapping navigation to sidebar"
```

---

## Notes for Future Work

1. **Parsing Logic:** After user provides sample invoice, update `backend/src/routes/invoices.js` upload endpoint with:
   - PDF parsing using `pdf-parse` or `pdf2json`
   - Image OCR using `tesseract.js` or cloud API
   - Field extraction logic based on sample format

2. **Cost Calculation:** Once invoices are mapped to recipes, add endpoint to calculate:
   - Cost per recipe based on invoice prices
   - Compare with menu pricing for profitability analysis

3. **Advanced Features:** (not in initial scope)
   - Bulk invoice upload
   - Automatic mapping suggestions
   - Invoice approval workflow
   - PDF generation for records

---

**Plan complete. Ready to execute using subagent-driven-development — I'll dispatch a fresh subagent per task with two-stage review (spec compliance then code quality). Shall I proceed?**
