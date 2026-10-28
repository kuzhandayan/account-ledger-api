CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS accounts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100)  NOT NULL CHECK (length(trim(name)) > 0),
    balance     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id    UUID          NOT NULL REFERENCES accounts(id),
    type          VARCHAR(10)   NOT NULL CHECK (type IN ('credit', 'debit')),
    amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    description   VARCHAR(255),
    reference_id  VARCHAR(100)  NOT NULL,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT unique_reference_per_account UNIQUE (account_id, reference_id)
);

-- Speeds up transaction history (latest first)
CREATE INDEX IF NOT EXISTS idx_transactions_account_created
    ON transactions (account_id, created_at DESC);

-- Transactions can't be updated or deleted, even directly in the database
CREATE OR REPLACE FUNCTION block_transaction_changes() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Transactions cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transactions_are_immutable ON transactions;
CREATE TRIGGER transactions_are_immutable
    BEFORE UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION block_transaction_changes();
