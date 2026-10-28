const express = require('express');
const transferService = require('../services/transferService');
const { validateCreateTransfer } = require('../utils/validators');

const router = express.Router();

// Transfer money from one account to another (atomic)
router.post('/', async (req, res) => {
  const data = validateCreateTransfer(req.body);
  const transfer = await transferService.createTransfer(data);
  res.status(201).json({ data: transfer });
});

module.exports = router;
