DJAMMS Database Migrations
==========================

This folder contains SQL migration scripts for the DJAMMS PostgreSQL database.

Applying Migrations
-------------------

1. Review the SQL file to ensure it matches your database setup (constraint names, schema).
2. Run the migration against your database (example using psql):

```bash
# Export connection variables or use a .pgpass file
PGHOST=your-db-host PGPORT=5432 PGUSER=youruser PGPASSWORD=yourpassword PGDATABASE=djamms_production \
  psql -f 2025_10_02_remove_refund_from_credit_transactions.sql
```

3. For production changes, run migrations during a maintenance window and ensure database backups are taken prior to applying schema changes.

4. If your constraint has a different name, edit the migration to match the existing constraint name before running.

Rollback
--------
If you need to rollback, restore from the pre-migration database backup. This script makes a destructive change to constraints and is not easily reversible.
