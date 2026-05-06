const Invoice = class Invoice {
  constructor(tenantDb) {
    this.db = tenantDb;
  }

  async create(invoiceData) {
    const {
      invoice_number, vendor_name, invoice_date, due_date,
      subtotal, tax_amount, total_amount, file_url, raw_parsed_data
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
    if (filters.vendor_name) {
      query += ` AND vendor_name ILIKE $${paramCount++}`;
      params.push(`%${filters.vendor_name}%`);
    }
    query += ' ORDER BY invoice_date DESC';
    const result = await this.db.query(query, params);
    return result.rows;
  }

  async findById(id) {
    const result = await this.db.query('SELECT * FROM invoices WHERE id = $1', [id]);
    return result.rows[0];
  }

  async update(id, invoiceData) {
    const { invoice_number, vendor_name, invoice_date, due_date, subtotal, tax_amount, total_amount } = invoiceData;
    const result = await this.db.query(
      `UPDATE invoices SET invoice_number = $1, vendor_name = $2, invoice_date = $3, due_date = $4,
       subtotal = $5, tax_amount = $6, total_amount = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [invoice_number, vendor_name, invoice_date, due_date, subtotal, tax_amount, total_amount, id]
    );
    return result.rows[0];
  }

  async delete(id) {
    // First delete associated line items to avoid orphaned records
    await this.db.query('DELETE FROM invoice_line_items WHERE invoice_id = $1', [id]);
    
    // Then delete the invoice
    const result = await this.db.query('DELETE FROM invoices WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Invoice not found');
    }
    
    return result.rows[0];
  }
};

module.exports = Invoice;