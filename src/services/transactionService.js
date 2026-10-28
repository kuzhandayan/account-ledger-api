const { pool, runInTransaction } = require('../db');
const AppError = require('../utils/AppError');
const { getBalance } = require('./accountService');

const TRANSACTION_COLUMNS = 'id, account_id, type, amount, description, reference_id, created_at';

/**
 * Adds one transaction to an account and updates the balance.
 * Must be called with a client that is already inside a DB transaction,
 * so the insert and the balance update are saved together or not at all.
 */
async function applyTransaction(client, { accountId, type, amount, description, referenceId }) {
  // 1. Lock the account row. Any other request for the same account waits here
  //    until we commit, so two debits can't both spend the same balance.
  const account = await client.query('SELECT id FROM accounts WHERE id = $1 FOR UPDATE', [accountId]);
  if (account.rows.length === 0) {
    throw new AppError(404, 'ACCOUNT_NOT_FOUND', `Account ${accountId} not found`);
  }

  // 2. Same reference_id already used on this account?
  const existing = await client.query(
    'SELECT id FROM transactions WHERE account_id = $1 AND reference_id = $2',
    [accountId, referenceId]
  );
  if (existing.rows.length > 0) {
    throw new AppError(
      409,
      'DUPLICATE_TRANSACTION',
      `A transaction with reference_id '${referenceId}' already exists for this account`,
      { existing_transaction_id: existing.rows[0].id }
    );
  }

  // 3. Update the balance. For a debit, the WHERE clause only matches if the
  //    balance is enough, so the balance can never go below 0.
  const change = type === 'credit' ? amount : -amount;
  const updated = await client.query(
    `UPDATE accounts SET balance = balance + $2
     WHERE id = $1 AND balance + $2 >= 0
     RETURNING balance`,
    [accountId, change]
  );
  if (updated.rows.length === 0) {
    throw new AppError(422, 'INSUFFICIENT_BALANCE', 'Account does not have enough balance for this debit');
  }

  // 4. Save the transaction record.
  const inserted = await client.query(
    `INSERT INTO transactions (account_id, type, amount, description, reference_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${TRANSACTION_COLUMNS}`,
    [accountId, type, amount, description, referenceId]
  );

  return { transaction: inserted.rows[0], balance: updated.rows[0].balance };
}

async function createTransaction(data) {
  return runInTransaction((client) => applyTransaction(client, data));
}

// Transactions of one account, latest first, with pagination.
// If type is given ('credit' or 'debit') only that type is returned, otherwise both.
async function listTransactions(accountId, { type, page, limit }) {
  await getBalance(accountId); // 404 if the account doesn't exist

  const offset = (page - 1) * limit;

  // "$2::text IS NULL" means: when no type is given, don't filter by type.
  const filter = 'WHERE account_id = $1 AND ($2::text IS NULL OR type = $2)';
  const filterValues = [accountId, type ?? null];

  const [rowsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT ${TRANSACTION_COLUMNS}
       FROM transactions
       ${filter}
       ORDER BY created_at DESC, id DESC
       LIMIT $3 OFFSET $4`,
      [...filterValues, limit, offset]
    ),
    pool.query(`SELECT COUNT(*)::int AS total FROM transactions ${filter}`, filterValues),
  ]);

  const totalRecords = countResult.rows[0].total;

  return {
    data: rowsResult.rows,
    pagination: {
      current_page: page,
      page_size: limit,
      total_records: totalRecords,
      total_pages: Math.ceil(totalRecords / limit),
    },
  };
}

module.exports = { applyTransaction, createTransaction, listTransactions };
