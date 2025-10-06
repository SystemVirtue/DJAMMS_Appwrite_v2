-- Migration: Remove 'REFUND' from credit_transactions.transaction_type CHECK constraint
-- This migration replaces the existing check to ensure transaction_type only allows
-- the permitted values: 'EARNED', 'SPENT', 'ADDED', 'REMOVED'.

DO $$
BEGIN
    -- Drop the existing constraint if it exists (adjust name as needed)
    IF EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'credit_transactions' AND c.conname = 'credit_transactions_transaction_type_check'
    ) THEN
        ALTER TABLE credit_transactions DROP CONSTRAINT credit_transactions_transaction_type_check;
    END IF;

    -- Add the updated constraint without 'REFUND'
    ALTER TABLE credit_transactions
    ADD CONSTRAINT credit_transactions_transaction_type_check CHECK (transaction_type IN ('EARNED', 'SPENT', 'ADDED', 'REMOVED'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Migration: Could not alter credit_transactions constraint: %', SQLERRM;
END$$;

-- Note: If your original constraint had a different name, adjust the DROP CONSTRAINT clause accordingly.
-- Test in a staging environment before applying to production.
