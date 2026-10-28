const { pool, runInTransaction } = require('../db');
const AppError = require('../utils/AppError');
const { getBalance } = require('./accountService');

const TRANSACTION_COLUMNS = 'id, account_id, type, amount, description, reference_id, created_at';

// Must be called inside runInTransaction, so the balance and the insert are saved together
async function applyTransaction(client, { accountId, type, amount, description, referenceId }) {
  // Lock the account row: parallel requests on this account wait their turn
  const account = await client.query('SELECT id FROM accounts WHERE id = $1 FOR UPDATE', [accountId]);
  if (account.rows.length === 0) {
    throw new AppError(404, 'ACCOUNT_NOT_FOUND', `Account ${accountId} not found`);
  }

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

  // Only updates if the new balance stays >= 0, otherwise the debit is rejected
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

async function listTransactions(accountId, { type, page, limit }) {
  await getBalance(accountId);

  const offset = (page - 1) * limit;

  // No type given = return both credit and debit
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
