# API Documentation

Base URL: `http://localhost:4000`

For POST requests, send JSON with the header `Content-Type: application/json`.

**When it works**, the response looks like:

```json
{ "data": { ... } }
```

**When something is wrong**, the response always looks like:

```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Account does not have enough balance for this debit"
  }
}
```

`code` is a fixed name you can check in code. `message` explains the problem in plain words.

---

## 1. Create Account

**POST** `/accounts`

Send:

```json
{ "name": "Alice" }
```

| Field | Required | Rule |
|---|---|---|
| name | Yes | Can't be empty, max 100 characters |

The balance always starts at 0. You can't send a balance.

Response – `201 Created`:

```json
{
  "data": {
    "id": "957dd23a-4b23-4044-acc7-7e1ca4fcd13b",
    "name": "Alice",
    "balance": 0,
    "created_at": "2026-10-28T07:03:05.100Z"
  }
}
```

Errors:

| Status | Code | When |
|---|---|---|
| 400 | VALIDATION_ERROR | Name missing or empty, or a balance was sent |
| 400 | INVALID_JSON | Body is not proper JSON |

---

## 2. Add Transaction

**POST** `/transactions`

Send:

```json
{
  "account_id": "957dd23a-4b23-4044-acc7-7e1ca4fcd13b",
  "type": "credit",
  "amount": 100,
  "description": "Salary",
  "reference_id": "ref-1"
}
```

| Field | Required | Rule |
|---|---|---|
| account_id | Yes | Must be an account that exists |
| type | Yes | `credit` (add money) or `debit` (take money) |
| amount | Yes | A number more than 0, up to 2 decimal places (e.g. 100 or 99.50) |
| reference_id | Yes | Can't repeat for the same account. Different accounts can use the same one |
| description | No | Max 255 characters |

Response – `201 Created`. You get the saved transaction and the new balance:

```json
{
  "data": {
    "id": "b8112339-26e9-4669-b6fa-335f4d06cbbe",
    "account_id": "957dd23a-4b23-4044-acc7-7e1ca4fcd13b",
    "type": "credit",
    "amount": 100,
    "description": "Salary",
    "reference_id": "ref-1",
    "created_at": "2026-10-28T07:03:05.130Z",
    "account_balance": 100
  }
}
```

Errors:

| Status | Code | When |
|---|---|---|
| 400 | VALIDATION_ERROR | A required field is missing or wrong (e.g. no reference_id) |
| 400 | INVALID_ACCOUNT_ID | account_id is not in the right ID format |
| 400 | INVALID_TRANSACTION_TYPE | type is not `credit` or `debit` |
| 400 | INVALID_AMOUNT | amount is missing, not a number, 0 or less, or has more than 2 decimals |
| 400 | INVALID_JSON | Body is not proper JSON |
| 404 | ACCOUNT_NOT_FOUND | No account with this ID |
| 409 | DUPLICATE_TRANSACTION | This reference_id was already used for this account. Also returns the ID of the existing transaction |
| 422 | INSUFFICIENT_BALANCE | Debit is more than the current balance |

If any error happens, the balance does not change.

Once created, a transaction can't be edited or deleted. There is no API for that.

---

## 3. Get Account Balance

**GET** `/accounts/:id/balance`

Example: `GET /accounts/957dd23a-4b23-4044-acc7-7e1ca4fcd13b/balance`

Response – `200 OK`:

```json
{
  "data": {
    "account_id": "957dd23a-4b23-4044-acc7-7e1ca4fcd13b",
    "balance": 100
  }
}
```

Errors:

| Status | Code | When |
|---|---|---|
| 400 | INVALID_ACCOUNT_ID | ID is not in the right format |
| 404 | ACCOUNT_NOT_FOUND | No account with this ID |

---

## 4. Get Transaction History

**GET** `/accounts/:id/transactions`

Newest transactions come first.

Optional query options:

| Option | Default | Rule |
|---|---|---|
| type | both | `credit` or `debit`. Leave it out to get both |
| page | 1 | Whole number, 1 or more |
| limit | 10 | Whole number from 1 to 100 (how many per page) |

Examples:

```
GET /accounts/957dd23a-4b23-4044-acc7-7e1ca4fcd13b/transactions
GET /accounts/957dd23a-4b23-4044-acc7-7e1ca4fcd13b/transactions?type=debit
GET /accounts/957dd23a-4b23-4044-acc7-7e1ca4fcd13b/transactions?type=credit&page=2&limit=5
```

Response – `200 OK`:

```json
{
  "data": [
    {
      "id": "11f9b9d6-5c6e-4102-98af-1ee6e3f418d6",
      "account_id": "957dd23a-4b23-4044-acc7-7e1ca4fcd13b",
      "type": "debit",
      "amount": 20,
      "description": null,
      "reference_id": "ref-4",
      "created_at": "2026-10-28T07:03:05.160Z"
    },
    {
      "id": "6abf6d78-c37f-4c80-aff3-004df4a76dc6",
      "account_id": "957dd23a-4b23-4044-acc7-7e1ca4fcd13b",
      "type": "debit",
      "amount": 30,
      "description": null,
      "reference_id": "ref-3",
      "created_at": "2026-10-28T07:03:05.150Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "page_size": 2,
    "total_records": 4,
    "total_pages": 2
  }
}
```

- `current_page` – which page this is
- `page_size` – how many items per page
- `total_records` – total matching transactions
- `total_pages` – how many pages there are

If you ask for a page after the last one, you get an empty list.

Errors:

| Status | Code | When |
|---|---|---|
| 400 | INVALID_TRANSACTION_TYPE | type is not `credit` or `debit` |
| 400 | INVALID_PAGINATION | page or limit is wrong (0, negative, text, or limit over 100) |
| 400 | INVALID_ACCOUNT_ID | ID is not in the right format |
| 404 | ACCOUNT_NOT_FOUND | No account with this ID |

---

## 5. Transfer Money (Bonus)

**POST** `/transfers`

Send:

```json
{
  "from_account_id": "957dd23a-4b23-4044-acc7-7e1ca4fcd13b",
  "to_account_id": "ebbfb520-f9d0-43b1-ba15-cab43be91bdf",
  "amount": 30,
  "reference_id": "transfer-1"
}
```

| Field | Required | Rule |
|---|---|---|
| from_account_id | Yes | Account to take money from. Must exist |
| to_account_id | Yes | Account to send money to. Must exist and be different from the first one |
| amount | Yes | Same rules as a transaction |
| reference_id | Yes | Saved on both sides of the transfer |
| description | No | If empty, it is filled in as "Transfer to ..." / "Transfer from ..." |

A transfer creates 2 normal transactions:
- a **debit** on the source account
- a **credit** on the destination account

Both are saved together. If anything fails, nothing is saved.

Example: A has 100, B has 50. Transfer 30 from A to B. Now A has 70 and B has 80.

Response – `201 Created`:

```json
{
  "data": {
    "reference_id": "transfer-1",
    "amount": 30,
    "from_account": {
      "id": "957dd23a-4b23-4044-acc7-7e1ca4fcd13b",
      "balance": 70,
      "transaction": { "id": "...", "type": "debit", "amount": 30, "...": "..." }
    },
    "to_account": {
      "id": "ebbfb520-f9d0-43b1-ba15-cab43be91bdf",
      "balance": 80,
      "transaction": { "id": "...", "type": "credit", "amount": 30, "...": "..." }
    }
  }
}
```

Errors:

| Status | Code | When |
|---|---|---|
| 400 | VALIDATION_ERROR | Missing field, or both accounts are the same |
| 400 | INVALID_ACCOUNT_ID | An account ID is not in the right format |
| 400 | INVALID_AMOUNT | Amount is wrong |
| 404 | ACCOUNT_NOT_FOUND | One of the accounts doesn't exist |
| 409 | DUPLICATE_TRANSACTION | reference_id already used on one of the accounts |
| 422 | INSUFFICIENT_BALANCE | Source account doesn't have enough money |

---

## Other errors

| Status | Code | When |
|---|---|---|
| 404 | ROUTE_NOT_FOUND | The URL or method doesn't exist (e.g. trying to DELETE a transaction) |
| 500 | INTERNAL_SERVER_ERROR | Something unexpected broke on the server |
