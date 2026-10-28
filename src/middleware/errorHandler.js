const AppError = require('../utils/AppError');

// Every error is returned as { error: { code, message } }
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.details) body.error.details = err.details;
    return res.status(err.statusCode).json(body);
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' },
    });
  }

  // Backup for duplicate reference_id, caught by the DB unique constraint
  if (err.code === '23505' && err.constraint === 'unique_reference_per_account') {
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_TRANSACTION',
        message: 'A transaction with this reference_id already exists for this account',
      },
    });
  }

  console.error(err);
  return res.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: 'ROUTE_NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` },
  });
}

module.exports = { errorHandler, notFoundHandler };
