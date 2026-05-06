const express = require('express');
const router = express.Router();

console.error('LOADING_SUPER_MINIMAL');

router.post('/', async (req, res) => {
  console.error('POST_HANDLER_REACHED');
  res.status(201).json({ test: 'super_minimal', body: req.body });
});

module.exports = router;
