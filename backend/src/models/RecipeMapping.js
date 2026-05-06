const RecipeMapping = class RecipeMapping {
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
};

module.exports = RecipeMapping;
