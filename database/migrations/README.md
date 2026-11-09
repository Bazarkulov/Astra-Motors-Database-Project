# Migration location

Supabase CLI discovers deployable migrations from `supabase/migrations/`. Apply them in filename order. The initial migration is [`../../supabase/migrations/20261102150000_initial_schema.sql`](../../supabase/migrations/20261102150000_initial_schema.sql); the demo-isolation follow-up is [`../../supabase/migrations/20261103100000_demo_inventory_support.sql`](../../supabase/migrations/20261103100000_demo_inventory_support.sql). `database/schema.sql` combines both migrations as a reference snapshot; do not run it in addition to the migrations.
