const InvoiceLineItem = class InvoiceLineItem {
  constructor(tenantDb) {
    this.db = tenantDb;
  }

  async create(lineItemData) {
    const { invoice_id, description, quantity, unit_price, line_total, recipe_id } = lineItemData;
    const result = await this.db.query(
      `INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price, line_total, recipe_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [invoice_id, description, quantity, unit_price, line_total, recipe_id]
    );
    return result.rows[0];
  }

  async findByInvoiceId(invoice_id) {
    const result = await this.db.query('SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY id', [invoice_id]);
    return result.rows;
  }

  async update(id, lineItemData) {
    const { description, quantity, unit_price, line_total, recipe_id } = lineItemData;
    const result = await this.db.query(
      `UPDATE invoice_line_items SET description = $1, quantity = $2, unit_price = $3, line_total = $4, recipe_id = $5
       WHERE id = $6 RETURNING *`,
      [description, quantity, unit_price, line_total, recipe_id, id]
    );
    return result.rows[0];
  }

  async delete(id) {
    const result = await this.db.query('DELETE FROM invoice_line_items WHERE id = $1 RETURNING *', [id]);
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
};

module.exports = InvoiceLineItem;