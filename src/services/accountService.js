const { pool } = require('../db');
const AppError = require('../utils/AppError');

// New accounts always start with balance 0 (set by the database default).
async function createAccount(name) {
  const result = await pool.query(
    `INSERT INTO accounts (name)
     VALUES ($1)
     RETURNING id, name, balance, created_at`,
    [name]
  );
  return result.rows[0];
}

async function getBalance(accountId) {
  const result = await pool.query(
    'SELECT id AS account_id, balance FROM accounts WHERE id = $1',
    [accountId]
  );
  if (result.rows.length === 0) {
    throw new AppError(404, 'ACCOUNT_NOT_FOUND', `Account ${accountId} not found`);
  }
  return result.rows[0];
}

module.exports = { createAccount, getBalance };
