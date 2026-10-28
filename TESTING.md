# How to Test

This guide tests every feature from the assignment, one step at a time.
Copy each block, paste it in the terminal, and compare with the **Expected** result.

Works in the macOS / Linux terminal. On Windows, use **Git Bash** or **WSL**.

---

## Before you start

### 1. Start the app

Start it with Docker (see [README.md](README.md) for the non-Docker way):

```bash
docker compose up --build
```

Wait until you see `Server running on http://localhost:4000`. Keep this terminal open.

### 2. Open a second terminal

Go to the project folder and paste this **once**. It adds two shortcuts used in all the steps below:

```bash
H='Content-Type: application/json'
c() { curl -s -w "  → %{http_code}\n" "$@"; }
```

- `H` is the JSON header we send with every POST.
- `c` calls the API and prints the response with the HTTP status code at the end (like `→ 201`).

> If you close this terminal, paste these two lines again (and re-run Step 2 to get the account IDs again).

---

## Step 1 – Server is running

```bash
c localhost:4000/health
```

**Expected:** `{"status":"ok"}  → 200`

---

## Step 2 – Create accounts

Creates two accounts, **Alice** and **Bob**, and saves their IDs in `A` and `B` for the next steps.

```bash
A=$(curl -s -X POST localhost:4000/accounts -H "$H" -d '{"name":"Alice"}' | sed -E 's/.*"id":"([^"]+)".*/\1/'); echo "Alice: $A"
B=$(curl -s -X POST localhost:4000/accounts -H "$H" -d '{"name":"Bob"}' | sed -E 's/.*"id":"([^"]+)".*/\1/'); echo "Bob:   $B"
c localhost:4000/accounts/$A/balance
```

**Expected:**
- Two IDs printed, like `Alice: 957dd23a-4b23-...`
- Alice's balance is `0  → 200` (every new account starts at 0)

---

## Step 3 – Credit and debit (the example from the assignment)

Credit 100, credit 50, debit 30, debit 20.

```bash
c -X POST localhost:4000/transactions -H "$H" -d "{\"account_id\":\"$A\",\"type\":\"credit\",\"amount\":100,\"reference_id\":\"r1\"}"
c -X POST localhost:4000/transactions -H "$H" -d "{\"account_id\":\"$A\",\"type\":\"credit\",\"amount\":50,\"reference_id\":\"r2\"}"
c -X POST localhost:4000/transactions -H "$H" -d "{\"account_id\":\"$A\",\"type\":\"debit\",\"amount\":30,\"reference_id\":\"r3\"}"
c -X POST localhost:4000/transactions -H "$H" -d "{\"account_id\":\"$A\",\"type\":\"debit\",\"amount\":20,\"reference_id\":\"r4\"}"
c localhost:4000/accounts/$A/balance
```

**Expected:**
- Each transaction returns `→ 201`
- `account_balance` goes **100 → 150 → 120 → 100**
- Final balance: **100**

---

## Step 4 – Debit more than the balance

```bash
c -X POST localhost:4000/transactions -H "$H" -d "{\"account_id\":\"$A\",\"type\":\"debit\",\"amount\":500,\"reference_id\":\"r5\"}"
c localhost:4000/accounts/$A/balance
```

**Expected:**
- `INSUFFICIENT_BALANCE  → 422`
- Balance is still **100** (a rejected transaction doesn't change anything)

---

## Step 5 – Same reference_id twice

Alice already used `r1`. Try it again on Alice, then on Bob:

```bash
c -X POST localhost:4000/transactions -H "$H" -d "{\"account_id\":\"$A\",\"type\":\"credit\",\"amount\":10,\"reference_id\":\"r1\"}"
c localhost:4000/accounts/$A/balance
c -X POST localhost:4000/transactions -H "$H" -d "{\"account_id\":\"$B\",\"type\":\"credit\",\"amount\":10,\"reference_id\":\"r1\"}"
```

**Expected:**
1. Alice again: `DUPLICATE_TRANSACTION  → 409` (no new transaction is created)
2. Alice's balance is still **100**
3. Bob: `→ 201`. A different account can use the same reference. Bob's balance is now 10

---

## Step 6 – Wrong input gives a clear error

```bash
c -X POST localhost:4000/accounts -H "$H" -d '{"name":""}'
c -X POST localhost:4000/accounts -H "$H" -d '{"name":"X","balance":500}'
c -X POST localhost:4000/accounts -H "$H" -d '{"name":'
c -X POST localhost:4000/transactions -H "$H" -d "{\"account_id\":\"$A\",\"type\":\"refund\",\"amount\":5,\"reference_id\":\"x\"}"
c -X POST localhost:4000/transactions -H "$H" -d "{\"account_id\":\"$A\",\"type\":\"credit\",\"amount\":0,\"reference_id\":\"x\"}"
c -X POST localhost:4000/transactions -H "$H" -d "{\"account_id\":\"$A\",\"type\":\"credit\",\"amount\":-5,\"reference_id\":\"x\"}"
c -X POST localhost:4000/transactions -H "$H" -d "{\"account_id\":\"$A\",\"type\":\"credit\",\"amount\":5}"
c -X POST localhost:4000/transactions -H "$H" -d '{"account_id":"11111111-1111-1111-1111-111111111111","type":"credit","amount":5,"reference_id":"x"}'
c localhost:4000/accounts/abc/balance
c localhost:4000/accounts/11111111-1111-1111-1111-111111111111/balance
```

**Expected** (one line per command, in the same order):

| # | What we sent | Result |
|---|---|---|
| 1 | Empty name | `400 VALIDATION_ERROR` – name is required |
| 2 | Name with a balance | `400 VALIDATION_ERROR` – balance can't be set |
| 3 | Broken JSON | `400 INVALID_JSON` |
| 4 | Type `refund` | `400 INVALID_TRANSACTION_TYPE` |
| 5 | Amount 0 | `400 INVALID_AMOUNT` |
| 6 | Amount -5 | `400 INVALID_AMOUNT` |
| 7 | No reference_id | `400 VALIDATION_ERROR` – reference_id is required |
| 8 | Account that doesn't exist | `404 ACCOUNT_NOT_FOUND` |
| 9 | ID in wrong format (`abc`) | `400 INVALID_ACCOUNT_ID` |
| 10 | Balance of an account that doesn't exist | `404 ACCOUNT_NOT_FOUND` |

Every error comes back in the same format:

```json
{ "error": { "code": "INVALID_AMOUNT", "message": "amount must be greater than 0" } }
```

---

## Step 7 – Transaction history

```bash
c "localhost:4000/accounts/$A/transactions"
c "localhost:4000/accounts/$A/transactions?type=credit"
c "localhost:4000/accounts/$A/transactions?type=debit"
c "localhost:4000/accounts/$A/transactions?page=1&limit=2"
c "localhost:4000/accounts/$A/transactions?page=2&limit=2"
c "localhost:4000/accounts/$A/transactions?type=refund"
c "localhost:4000/accounts/$A/transactions?page=0"
c "localhost:4000/accounts/$A/transactions?limit=500"
```

**Expected** (in the same order):

| # | What we asked | Result |
|---|---|---|
| 1 | All transactions | 4 items, newest first: r4, r3, r2, r1 |
| 2 | `type=credit` | Only the 2 credits: r2, r1 |
| 3 | `type=debit` | Only the 2 debits: r4, r3 |
| 4 | Page 1, 2 per page | r4, r3 |
| 5 | Page 2, 2 per page | r2, r1 |
| 6 | `type=refund` | `400 INVALID_TRANSACTION_TYPE` |
| 7 | `page=0` | `400 INVALID_PAGINATION` |
| 8 | `limit=500` (max is 100) | `400 INVALID_PAGINATION` |

Every list ends with a `pagination` block. For #4 it is:

```json
"pagination": { "current_page": 1, "page_size": 2, "total_records": 4, "total_pages": 2 }
```

The failed debit from Step 4 and the duplicate from Step 5 are **not** in the list.

---

## Step 8 – Transactions can't be edited or deleted

```bash
c -X DELETE localhost:4000/transactions/anything
c -X PUT localhost:4000/transactions/anything -H "$H" -d '{"amount":1}'
```

**Expected:** `ROUTE_NOT_FOUND  → 404` for both. There is no API to change or delete a transaction.

---

## Step 9 – Transfer money (bonus)

Alice has 100, Bob has 10. Transfer 30 from Alice to Bob.

```bash
c -X POST localhost:4000/transfers -H "$H" -d "{\"from_account_id\":\"$A\",\"to_account_id\":\"$B\",\"amount\":30,\"reference_id\":\"t1\"}"
c localhost:4000/accounts/$A/balance
c localhost:4000/accounts/$B/balance
```

**Expected:**
- Transfer: `→ 201`
- Alice: **70**
- Bob: **40**

Now three transfers that must fail and move no money:

```bash
c -X POST localhost:4000/transfers -H "$H" -d "{\"from_account_id\":\"$A\",\"to_account_id\":\"$B\",\"amount\":999,\"reference_id\":\"t2\"}"
c -X POST localhost:4000/transfers -H "$H" -d "{\"from_account_id\":\"$A\",\"to_account_id\":\"$A\",\"amount\":5,\"reference_id\":\"t3\"}"
c -X POST localhost:4000/transfers -H "$H" -d "{\"from_account_id\":\"$A\",\"to_account_id\":\"11111111-1111-1111-1111-111111111111\",\"amount\":5,\"reference_id\":\"t4\"}"
c localhost:4000/accounts/$A/balance
c localhost:4000/accounts/$B/balance
```

**Expected:**

| # | What we sent | Result |
|---|---|---|
| 1 | More than Alice has | `422 INSUFFICIENT_BALANCE` |
| 2 | Alice to Alice | `400 VALIDATION_ERROR` – accounts must be different |
| 3 | To an account that doesn't exist | `404 ACCOUNT_NOT_FOUND` |
| 4 | Alice's balance | Still **70** |
| 5 | Bob's balance | Still **40** |

---

## Step 10 – Many requests at the same time

Alice has 70. Send **20 debits of 10 at the same moment**. Only 7 can succeed.

```bash
( for i in {1..20}; do curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:4000/transactions -H "$H" -d "{\"account_id\":\"$A\",\"type\":\"debit\",\"amount\":10,\"reference_id\":\"p$i\"}" & done; wait ) | sort | uniq -c
c localhost:4000/accounts/$A/balance
```

**Expected:**
```
   7 201
  13 422
```
Balance: **0**. It never goes negative, even when requests arrive together.

---

## Start again with fresh data

**With Docker:**

```bash
docker compose down -v
docker compose up --build
```

**Without Docker:**

```bash
dropdb ledger && createdb ledger && npm run db:setup
```

Then paste the two lines from "Before you start" again and continue from Step 2.

---

## If something doesn't work

| Problem | Fix |
|---|---|
| `Connection refused` or `→ 000` | The server isn't running. Start it (see "Before you start") |
| `Port 4000 is already in use` | Change `"4000:4000"` in `docker-compose.yml` to `"5050:4000"`, restart, and use `localhost:5050` in the commands |
| `ACCOUNT_NOT_FOUND` in every step | `A` / `B` are empty (new terminal). Run Step 2 again |
| `DUPLICATE_TRANSACTION` when re-running steps | Reference IDs were already used. Start again with fresh data (above) |
