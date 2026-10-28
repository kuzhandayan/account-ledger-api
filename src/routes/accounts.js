const express = require('express');
const accountService = require('../services/accountService');
const transactionService = require('../services/transactionService');
const { validateCreateAccount, validateAccountId, validateHistoryQuery } = require('../utils/validators');

const router = express.Router();

// 1. Create an account
router.post('/', async (req, res) => {
  const { name } = validateCreateAccount(req.body);
  const account = await accountService.createAccount(name);
  res.status(201).json({ data: account });
});

// 3. Get account balance
router.get('/:id/balance', async (req, res) => {
  validateAccountId(req.params.id, 'id');
  const balance = await accountService.getBalance(req.params.id);
  res.json({ data: balance });
});

// 4. Get transaction history (optional type filter, paginated, latest first)
router.get('/:id/transactions', async (req, res) => {
  validateAccountId(req.params.id, 'id');
  const { type, page, limit } = validateHistoryQuery(req.query);
  const result = await transactionService.listTransactions(req.params.id, { type, page, limit });
  res.json(result);
});

module.exports = router;
