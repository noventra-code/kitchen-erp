const express = require('express');
const router = express.Router();
const RecipeMapping = require('../models/RecipeMapping');

// Get all mappings for tenant
router.get('/', async (req, res) => {
  try {
    const mappingModel = new RecipeMapping(req.mainPool || req.tenantDb);
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
    if (error.code === '23505') {
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
