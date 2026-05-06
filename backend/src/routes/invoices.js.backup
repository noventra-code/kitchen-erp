const express = require('express');
const router = express.Router();
console.error('LOADING_INVOICES_ROUTES_MODULE');

// All routes below will have tenantMiddleware applied in index.js
// So req.tenantDb is available

// Helper: convert decimal fields from strings to numbers
function convertInvoiceFields(invoice) {
  if (!invoice) return invoice;
  
  // Handle both old and new column names
  const totalAmount = invoice.total_amount !== undefined ? invoice.total_amount : invoice.total;
  const vendorName = invoice.vendor_name !== undefined ? invoice.vendor_name : invoice.vendor;
  
  return {
    ...invoice,
    total_amount: parseFloat(totalAmount) || 0,
    total: parseFloat(totalAmount) || 0, // Ensure both are set
    subtotal: parseFloat(invoice.subtotal) || 0,
    tax_amount: parseFloat(invoice.tax_amount) || 0,
    vendor_name: vendorName || '',
    vendor: vendorName || '', // Ensure both are set
  };
}

function convertLineItemFields(item) {
  if (!item) return item;
  return {
    ...item,
    quantity: parseFloat(item.quantity) || 0,
    unit_price: parseFloat(item.unit_price) || 0,
    line_total: parseFloat(item.line_total) || 0,
    cases: parseFloat(item.cases) || 0,
    line_number: parseInt(item.line_number) || 0,
  };
}

// GET /api/invoices/summary - invoice summary stats
// Note: Invoices are used for item pricing, not traditional invoice tracking
router.get('/summary', async (req, res) => {
  try {
    const result = await req.tenantDb.query(
      `SELECT
        COUNT(*) as total_invoices
       FROM invoices`
    );

    res.json({
      total_invoices: parseInt(result.rows[0].total_invoices) || 0
    });
  } catch (error) {
    console.error('Error fetching invoice summary:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/invoices - list invoices with optional search
router.get('/', async (req, res) => {
  try {
    const { search, sort = 'invoice_date_desc' } = req.query;
    let query = 'SELECT * FROM invoices';
    let params = [];
    let conditions = [];

    if (search) {
      conditions.push(`(COALESCE(vendor_name, vendor) ILIKE $${params.length + 1} OR invoice_number ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Sorting
    const sortMap = {
      'invoice_date_desc': 'ORDER BY invoice_date DESC, created_at DESC',
      'invoice_date_asc': 'ORDER BY invoice_date ASC, created_at ASC',
      'total_desc': 'ORDER BY total_amount DESC',
      'total_asc': 'ORDER BY total_amount ASC',
      'vendor_asc': 'ORDER BY COALESCE(vendor_name, vendor) ASC',
      'vendor_desc': 'ORDER BY COALESCE(vendor_name, vendor) DESC',
    };
    query += ' ' + (sortMap[sort] || sortMap['invoice_date_desc']);

    const result = await req.tenantDb.query(query, params);
    const invoices = result.rows.map(convertInvoiceFields);
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/invoices/:id - get single invoice with line items
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const invoiceResult = await req.tenantDb.query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = convertInvoiceFields(invoiceResult.rows[0]);

    const lineItemsResult = await req.tenantDb.query(
      'SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY id ASC',
      [id]
    );

    invoice.line_items = lineItemsResult.rows.map(convertLineItemFields);

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/invoices - create invoice with line items
router.post('/', async (req, res) => {
  console.error('POST_HANDLER_REACHED');
  try {
    console.error('POST_HANDLER_TRY_BLOCK');
    const {
      invoice_number,
      vendor_name,
      vendor,
      invoice_date,
      due_date,
      subtotal = 0,
      tax_amount = 0,
      total_amount,
      total,
      line_items = [],
    } = req.body;

    // Use vendor_name if provided, fallback to vendor
    const vendorFinal = vendor_name || vendor || '';
    
    // Use total_amount if provided, fallback to total
    const totalFinal = parseFloat(total_amount) || parseFloat(total) || 0;

    // Calculate total from line items if not provided
    let calculatedTotal = totalFinal;
    if (calculatedTotal === 0 && line_items.length > 0) {
      calculatedTotal = line_items.reduce((sum, item) => {
        return sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0));
      }, 0);
      calculatedTotal += (parseFloat(tax_amount) || 0);
    }

    // Start transaction
    await req.tenantDb.query('BEGIN');

    try {
      const invoiceResult = await req.tenantDb.query(
        `INSERT INTO invoices 
         (invoice_number, vendor_name, invoice_date, due_date, total_amount, subtotal, tax_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          invoice_number,
          vendorFinal,
          invoice_date,
          due_date,
          calculatedTotal,
          parseFloat(subtotal) || 0,
          parseFloat(tax_amount) || 0,
        ]
      );
      console.error('INSERT successful, invoice:', invoiceResult.rows[0].id);

      const invoice = invoiceResult.rows[0];

      // Insert line items
      const insertedItems = [];
      for (const item of line_items) {
        const lineResult = await req.tenantDb.query(
          `INSERT INTO invoice_line_items
           (invoice_id, line_number, cases, pack_size, category, description, quantity, unit_price, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            invoice.id,
            parseInt(item.line_number) || null,
            parseFloat(item.cases) || null,
            item.pack_size || null,
            item.category || null,
            item.description || '',
            parseFloat(item.quantity) || 0,
            parseFloat(item.unit_price) || 0,
            (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0),
          ]
        );
        insertedItems.push(convertLineItemFields(lineResult.rows[0]));
      }

      await req.tenantDb.query('COMMIT');

      invoice.line_items = insertedItems;
      res.status(201).json(convertInvoiceFields(invoice));
    } catch (txError) {
      await req.tenantDb.query('ROLLBACK');
      throw txError;
    }
  } catch (error) {
    console.error('Error creating invoice:', error.message, error.stack);
    res.status(500).json({ error: 'VERSION_12345: ' + error.message });
  }
});

// PUT /api/invoices/:id - update invoice with line items
router.put('/:id', async (req, res) => {
  console.error('PUT_HANDLER_REACHED');
  try {
    const { id } = req.params;
    const {
      invoice_number,
      vendor_name,
      vendor,
      invoice_date,
      due_date,
      subtotal,
      tax_amount,
      total_amount,
      line_items,
    } = req.body;

    const vendorFinal = vendor_name || vendor || '';

    // Check if invoice exists
    const existingResult = await req.tenantDb.query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await req.tenantDb.query('BEGIN');

    try {
      // Update invoice
      const updateFields = [];
      const updateParams = [];
      let paramCount = 1;

      if (invoice_number !== undefined) {
        updateFields.push(`invoice_number = $${paramCount++}`);
        updateParams.push(invoice_number);
      }
      if (vendorFinal !== undefined) {
        updateFields.push(`vendor_name = $${paramCount++}`);
        updateParams.push(vendorFinal);
      }
      if (invoice_date !== undefined) {
        updateFields.push(`invoice_date = $${paramCount++}`);
        updateParams.push(invoice_date);
      }
      if (due_date !== undefined) {
        updateFields.push(`due_date = $${paramCount++}`);
        updateParams.push(due_date);
      }
      if (subtotal !== undefined) {
        updateFields.push(`subtotal = $${paramCount++}`);
        updateParams.push(parseFloat(subtotal) || 0);
      }
      if (tax_amount !== undefined) {
        updateFields.push(`tax_amount = $${paramCount++}`);
        updateParams.push(parseFloat(tax_amount) || 0);
      }
      if (total_amount !== undefined) {
        updateFields.push(`total_amount = $${paramCount++}`);
        updateParams.push(parseFloat(total_amount) || 0);
      }

      updateParams.push(id);
      const updateQuery = `UPDATE invoices SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      const invoiceResult = await req.tenantDb.query(updateQuery, updateParams);
      const invoice = convertInvoiceFields(invoiceResult.rows[0]);

      // Update line items if provided
      if (line_items && Array.isArray(line_items)) {
        // Delete existing line items
        await req.tenantDb.query('DELETE FROM invoice_line_items WHERE invoice_id = $1', [id]);

        // Insert new line items
        const insertedItems = [];
        for (const item of line_items) {
          const lineResult = await req.tenantDb.query(
            `INSERT INTO invoice_line_items
             (invoice_id, line_number, cases, pack_size, category, description, quantity, unit_price, line_total)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
              id,
              parseInt(item.line_number) || null,
              parseFloat(item.cases) || null,
              item.pack_size || null,
              item.category || null,
              item.description || '',
              parseFloat(item.quantity) || 0,
              parseFloat(item.unit_price) || 0,
              (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0),
            ]
          );
          insertedItems.push(convertLineItemFields(lineResult.rows[0]));
        }
        invoice.line_items = insertedItems;
      } else {
        // Just return existing line items
        const lineItemsResult = await req.tenantDb.query(
          'SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY id ASC',
          [id]
        );
        invoice.line_items = lineItemsResult.rows.map(convertLineItemFields);
      }

      await req.tenantDb.query('COMMIT');
      res.json(invoice);
    } catch (txError) {
      await req.tenantDb.query('ROLLBACK');
      throw txError;
    }
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// DELETE /api/invoices/:id - delete invoice and line items
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingResult = await req.tenantDb.query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Line items will be deleted automatically via ON DELETE CASCADE
    await req.tenantDb.query('DELETE FROM invoices WHERE id = $1', [id]);

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug endpoint to check table schema
router.get('/debug/schema', async (req, res) => {
  try {
    const result = await req.tenantDb.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'invoices'
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
