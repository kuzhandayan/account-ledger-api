const AppError = require('./AppError');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_AMOUNT = 9999999999.99; // fits NUMERIC(12,2)

function validationError(message, code = 'VALIDATION_ERROR') {
  return new AppError(400, code, message);
}

function ensureObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw validationError('Request body must be a JSON object');
  }
}

function validateAccountId(id, field = 'account_id') {
  if (typeof id !== 'string' || !UUID_REGEX.test(id)) {
    throw validationError(`${field} must be a valid UUID`, 'INVALID_ACCOUNT_ID');
  }
}

function validateAmount(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw validationError('amount must be a number', 'INVALID_AMOUNT');
  }
  if (amount <= 0) {
    throw validationError('amount must be greater than 0', 'INVALID_AMOUNT');
  }
  if (amount > MAX_AMOUNT) {
    throw validationError(`amount cannot be more than ${MAX_AMOUNT}`, 'INVALID_AMOUNT');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(String(amount))) {
    throw validationError('amount can have at most 2 decimal places', 'INVALID_AMOUNT');
  }
}

function validateReferenceId(referenceId) {
  if (typeof referenceId !== 'string' || referenceId.trim() === '') {
    throw validationError('reference_id is required');
  }
  if (referenceId.trim().length > 100) {
    throw validationError('reference_id cannot be longer than 100 characters');
  }
}

function validateDescription(description) {
  if (description === undefined || description === null) return;
  if (typeof description !== 'string') {
    throw validationError('description must be a string');
  }
  if (description.length > 255) {
    throw validationError('description cannot be longer than 255 characters');
  }
}

function validateCreateAccount(body) {
  ensureObject(body);
  const { name } = body;
  if (body.balance !== undefined) {
    throw validationError('balance cannot be set. A new account always starts with balance 0');
  }
  if (typeof name !== 'string' || name.trim() === '') {
    throw validationError('name is required');
  }
  if (name.trim().length > 100) {
    throw validationError('name cannot be longer than 100 characters');
  }
  return { name: name.trim() };
}

function validateCreateTransaction(body) {
  ensureObject(body);
  const { account_id, type, amount, description, reference_id } = body;

  if (account_id === undefined) throw validationError('account_id is required');
  validateAccountId(account_id);

  if (type !== 'credit' && type !== 'debit') {
    throw validationError("type must be either 'credit' or 'debit'", 'INVALID_TRANSACTION_TYPE');
  }

  if (amount === undefined) throw validationError('amount is required', 'INVALID_AMOUNT');
  validateAmount(amount);
  validateReferenceId(reference_id);
  validateDescription(description);

  return {
    accountId: account_id,
    type,
    amount,
    description: description ?? null,
    referenceId: reference_id.trim(),
  };
}

function validateCreateTransfer(body) {
  ensureObject(body);
  const { from_account_id, to_account_id, amount, description, reference_id } = body;

  if (from_account_id === undefined) throw validationError('from_account_id is required');
  validateAccountId(from_account_id, 'from_account_id');
  if (to_account_id === undefined) throw validationError('to_account_id is required');
  validateAccountId(to_account_id, 'to_account_id');

  if (from_account_id.toLowerCase() === to_account_id.toLowerCase()) {
    throw validationError('from_account_id and to_account_id must be different');
  }

  if (amount === undefined) throw validationError('amount is required', 'INVALID_AMOUNT');
  validateAmount(amount);
  validateReferenceId(reference_id);
  validateDescription(description);

  return {
    fromAccountId: from_account_id,
    toAccountId: to_account_id,
    amount,
    description: description ?? null,
    referenceId: reference_id.trim(),
  };
}

// Defaults: page 1, limit 10 (max 100). No type = both credit and debit
function validateHistoryQuery(query) {
  const { type } = query;
  const page = query.page === undefined ? '1' : query.page;
  const limit = query.limit === undefined ? '10' : query.limit;

  if (type !== undefined && type !== 'credit' && type !== 'debit') {
    throw validationError("type must be either 'credit' or 'debit'", 'INVALID_TRANSACTION_TYPE');
  }

  if (typeof page !== 'string' || !/^[1-9]\d*$/.test(page) || Number(page) > 1000000) {
    throw validationError('page must be an integer between 1 and 1000000', 'INVALID_PAGINATION');
  }
  if (typeof limit !== 'string' || !/^[1-9]\d*$/.test(limit) || Number(limit) > 100) {
    throw validationError('limit must be an integer between 1 and 100', 'INVALID_PAGINATION');
  }
  return { type, page: Number(page), limit: Number(limit) };
}

module.exports = {
  validateAccountId,
  validateCreateAccount,
  validateCreateTransaction,
  validateCreateTransfer,
  validateHistoryQuery,
};
