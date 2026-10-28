# Assumptions

These are the decisions I made where the brief didn't say exactly what to do.

1. **One currency.** All accounts use the same currency. Amounts can have up to 2 decimal places (like 99.50).

2. **Amount must be a number.** `100` and `99.50` are accepted. Text like `"100"` is rejected. An amount like `10.555` is rejected instead of being rounded.

3. **Sending balance when creating an account is rejected.** The brief says the client can't set the balance. So if `balance` is sent, the API returns an error instead of quietly ignoring it.

4. **Duplicate reference_id returns 409 (Conflict).** No new transaction is created and the balance stays the same. The response also gives the ID of the transaction that already exists.

5. **Not enough balance returns 422.** The request itself is fine, but it can't be done with the current balance. The balance can never go below 0.

6. **Wrong ID vs missing account.** An ID in the wrong format (like `abc`) returns `400`. A correct-format ID that doesn't exist returns `404`.

7. **Pagination.** Default is page 1 with 10 items. Max limit is 100. Wrong values (0, negative, text, more than 100) return an error instead of being changed silently. A page after the last page returns an empty list.

8. **Same time order.** If two transactions have the exact same time, they are sorted by ID so the order is always the same.

9. **A transfer is 2 transactions.** One debit on the source and one credit on the destination, with the same reference_id. So transfers show up in both accounts' history and are part of the balance like any other transaction. You can't transfer to the same account.

10. **No login.** The brief doesn't mention login, so the APIs are open. In a real app, users would log in and only see their own accounts.

11. **Accounts can't be edited or deleted.** It's not in the brief, and deleting an account would lose its transaction history.
