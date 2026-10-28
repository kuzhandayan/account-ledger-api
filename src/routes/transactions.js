const express = require('express');
const transactionService = require('../services/transactionService');
const { validateCreateTransaction } = require('../utils/validators');

const router = express.Router();

// No update/delete routes on purpose: transactions are immutable
router.post('/', async (req, res) => {
  const data = validateCreateTransaction(req.body);
  const { transaction, balance } = await transactionService.createTransaction(data);
  res.status(201).json({ data: { ...transaction, account_balance: balance } });
});

module.exports = router;
