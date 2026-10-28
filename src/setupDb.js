// Creates the tables from db/schema.sql (npm run db:setup)
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function setup() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Database schema is ready.');
}

setup()
  .catch((err) => {
    console.error('Failed to set up database:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
