const { runInTransaction } = require('../db');
const AppError = require('../utils/AppError');
const { applyTransaction } = require('./transactionService');

// Debit and credit run in one DB transaction, so a transfer is never half done
async function createTransfer({ fromAccountId, toAccountId, amount, description, referenceId }) {
  return runInTransaction(async (client) => {
    // Lock both accounts in id order so two opposite transfers can't deadlock
    const locked = await client.query(
      'SELECT id FROM accounts WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE',
      [[fromAccountId, toAccountId]]
    );
    const foundIds = locked.rows.map((row) => row.id);
    for (const id of [fromAccountId, toAccountId]) {
      if (!foundIds.includes(id.toLowerCase())) {
        throw new AppError(404, 'ACCOUNT_NOT_FOUND', `Account ${id} not found`);
      }
    }

    const debit = await applyTransaction(client, {
      accountId: fromAccountId,
      type: 'debit',
      amount,
      description: description ?? `Transfer to ${toAccountId}`,
      referenceId,
    });

    const credit = await applyTransaction(client, {
      accountId: toAccountId,
      type: 'credit',
      amount,
      description: description ?? `Transfer from ${fromAccountId}`,
      referenceId,
    });

    return {
      reference_id: referenceId,
      amount,
      from_account: { id: fromAccountId, balance: debit.balance, transaction: debit.transaction },
      to_account: { id: toAccountId, balance: credit.balance, transaction: credit.transaction },
    };
  });
}

module.exports = { createTransfer };
