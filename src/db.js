const { Pool, types } = require('pg');
require('dotenv').config({ quiet: true });

// Return money columns (NUMERIC) as numbers instead of strings
types.setTypeParser(1700, (value) => parseFloat(value));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Runs work in one DB transaction: commit if it succeeds, roll back if anything fails
async function runInTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, runInTransaction };
