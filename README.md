# Transaction Ledger API

A simple backend API where you can:

- create an account
- add money to it (credit) or take money from it (debit)
- check the account balance
- see the transaction history (filter by credit/debit, page by page, latest first)
- transfer money from one account to another

Built with **Node.js**, **Express** and **PostgreSQL**.

More details:
- [API.md](API.md) – all the APIs with examples
- [ASSUMPTIONS.md](ASSUMPTIONS.md) – decisions I made where the brief was open

---

## How to run it

There are two ways. Option A is the easiest.

### Option A – With Docker (one command)

You only need Docker installed. No need to install Node.js or PostgreSQL.

```bash
docker compose up --build
```

This starts the database and the API together, and creates the tables automatically.
When you see `Server running on http://localhost:4000`, it's ready.

To stop it, press `Ctrl + C`, or run `docker compose down`.
To stop it and also delete all the data, run `docker compose down -v`.

If port 4000 is already used on your machine, open `docker-compose.yml` and change `"4000:4000"` to another port, for example `"5050:4000"`. The API will then be at http://localhost:5050.

### Option B – Without Docker

#### Step 1 – Install these first

- Node.js (version 18 or above)
- PostgreSQL

#### Step 2 – Install packages

```bash
npm install
```

#### Step 3 – Add the database details

```bash
cp .env.example .env
```

Open `.env` and check the database URL. The default is:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/ledger
```

Format: `postgres://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME`. Change it if yours is different.

Create the database once:

```bash
createdb ledger
```

#### Step 4 – Create the tables

```bash
npm run db:setup
```

#### Step 5 – Start the server

```bash
npm start
```

### Check it's running

With either option, the server runs at **http://localhost:4000**.

To check it's working, open http://localhost:4000/health. You should see `{"status":"ok"}`.

---

## APIs

| What it does | Method | URL |
|---|---|---|
| Create account | POST | `/accounts` |
| Add transaction | POST | `/transactions` |
| Get balance | GET | `/accounts/:id/balance` |
| Transaction history | GET | `/accounts/:id/transactions?type=credit&page=1&limit=10` |
| Transfer money (bonus) | POST | `/transfers` |

### Try it quickly

```bash
# 1. Create an account (copy the "id" from the response)
curl -X POST http://localhost:4000/accounts \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice"}'

# 2. Add 100 to the account
curl -X POST http://localhost:4000/transactions \
  -H "Content-Type: application/json" \
  -d '{"account_id": "PASTE_ID_HERE", "type": "credit", "amount": 100, "reference_id": "ref-1"}'

# 3. Check the balance
curl http://localhost:4000/accounts/PASTE_ID_HERE/balance

# 4. See the history
curl "http://localhost:4000/accounts/PASTE_ID_HERE/transactions?page=1&limit=10"
```

---

## Folder structure

```
Dockerfile             how to build the API container
docker-compose.yml     runs the API + PostgreSQL together
db/schema.sql          tables and database rules
src/
  server.js            starts the server
  app.js               connects all the routes
  db.js                database connection
  setupDb.js           creates the tables (npm run db:setup)
  routes/              the API endpoints
  services/            the main logic (balance update, transfer, history)
  middleware/          sends all errors in the same format
  utils/               input checks and the error class
```

Each request flows like this: **route** (checks the input) → **service** (does the work) → **database**.

---

## How the money stays correct

**Everything or nothing.** When a transaction is added, saving the transaction and updating the balance happen together. If one step fails, both are cancelled. Same for transfers: the money is taken from one account and added to the other together, or not at all. A half-done transfer is not possible.

**Two requests at the same time.** If two requests try to change the same account at the same moment, the second one waits until the first one finishes. So two debits can never spend the same money twice. I tested this by sending 20 debits at once on an account with 70. Exactly 7 succeeded and the balance ended at 0.

**Balance never goes below 0.** A debit bigger than the balance is rejected, and the balance stays the same.

**Same reference_id twice.** If the same `reference_id` is sent again for the same account, no new transaction is created and the balance doesn't change. The API returns `409` saying it already exists.

**Transactions can't be changed.** There is no API to edit or delete a transaction. The database also blocks any edit or delete, even if someone tries directly in the database.

**Database rules.** The database itself also checks the main rules: amount must be more than 0, balance can't go below 0, type must be credit or debit, and a `reference_id` can't repeat for the same account. So even a bug in the code can't save wrong data.

**Exact money values.** Amounts are stored as exact decimals (like 10.50). This avoids small rounding errors like 0.1 + 0.2 = 0.30000000000000004.
# account-ledger-api
