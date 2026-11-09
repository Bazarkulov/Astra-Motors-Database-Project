# Motors & Heritage

An independent dealership platform for classic, vintage, muscle, sports, and performance automobiles. The public site and protected administration interface will share Supabase PostgreSQL, with Supabase Auth and Storage.

## Stack

- Next.js App Router, React, TypeScript, and Tailwind CSS
- Supabase PostgreSQL, Auth, and Storage
- Lucide React icons and Recharts
- Python, pandas, and NumPy for the planned inventory data pipeline

## Local setup

1. Install Node.js 20.9 or newer.
2. Copy `.env.example` to `.env.local`. Put the Supabase project URL in `NEXT_PUBLIC_SUPABASE_URL`, its publishable key in `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and its secret key in `SUPABASE_SERVICE_ROLE_KEY`. Keep `.env.local` private.
3. Install packages with `npm install`.
4. Start the development server with `npm run dev` and open http://localhost:3000.

The Supabase secret key (legacy `service_role`) is server-only and must never be exposed in browser code. The service-role helper is isolated in `src/lib/supabase/admin.ts`; ordinary public and authenticated requests use the publishable key and database policies.

## Project status

Phase 2 establishes the Next.js and Tailwind scaffold, shared dependencies, environment variable template, and Supabase client helpers. Phase 3 adds the initial versioned PostgreSQL migration, Row Level Security policies, storage buckets, and schema documentation. Phase 4 adds a reproducible Kaggle CSV cleaner, an opt-in draft-only Supabase importer, and an idempotent seed for linked, clearly marked fictional workflow data. Phase 5 adds public catalog pages and inquiry/test-drive forms. Phase 6 includes protected admin authentication, a database aggregate dashboard, vehicle CRUD, listing publication controls, photo upload, and operational CRM screens. Add the source CSV separately; database-backed features require the migration to be applied to your Supabase project.

## Database foundation

- Migrations: `supabase/migrations/` (apply in filename order)
- Latest schema snapshot: `database/schema.sql`
- ER diagram and table documentation: `database/er-diagram.md`
- Supabase CLI config: `supabase/config.toml`

After linking the intended project, inspect and apply pending migrations with `supabase db push`. For the initial dashboard setup, apply each migration in `supabase/migrations/` in filename order. The second migration adds demo-inventory isolation and the admin demo-count view. Do not apply `database/schema.sql` separately; it combines the migrations for reference.

Public catalog reads use explicit public views. Customer and business records remain staff-only under RLS. Contact and test-drive forms use validated server-side submission handling.

## Kaggle inventory pipeline

The initial pipeline targets [Austin Reese's Craigslist Used Cars dataset](https://www.kaggle.com/datasets/austinreese/craigslist-carstrucks-data). Kaggle metadata currently declares CC0, but this is a broad, older U.S. classifieds scrape rather than a vetted collector-car catalog. It cannot establish current availability, authenticity, condition, or image reuse rights. Treat imports as staff-review candidates only. The script drops listing URLs and free-text descriptions, does not import photos, records source provenance, and creates each vehicle as an unpublished `draft`.

1. Download the dataset from Kaggle and place the untouched `vehicles.csv` at `data/raw/vehicles.csv`.
2. Install pipeline dependencies with `.venv/bin/python -m pip install -r requirements.txt` (create `.venv` first with `python3 -m venv .venv`).
3. Inspect and clean to a separate output with `.venv/bin/python scripts/clean_dataset.py data/raw/vehicles.csv`.
4. For a small database pilot, configure `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then run `.venv/bin/python scripts/import_kaggle.py data/raw/vehicles.csv --limit 100 --import-to-supabase`.

The service-role key bypasses RLS; keep it in your local environment and never commit it. Imports are idempotent by dataset name and source record ID. Review vehicle details and verify rights and availability before publishing. Confirm the license shown for the exact Kaggle dataset version before commercial reuse.

## Optional demo workflow data

After applying all migrations, add the local Supabase URL and secret key to `.env.local` and run `.venv/bin/python scripts/seed_demo_data.py`. It creates linked fictional customers, unpublished demo vehicles, inquiries, inspections, a test drive, a consignment, sales, payments, a finance application, a shipment, and a saved vehicle. The seed is safe to rerun and marks synthetic records `is_demo`; demo vehicles are filtered out of the public catalog. It creates no fake photos or staff accounts. Dashboard totals and charts exclude demo records; admin list pages label the demo rows. Do not use this seed as live customer data.

## Public-site behavior

Homepage, inventory search/filter/sort/pagination, vehicle detail, about, and contact pages are in `src/app/`. Public inventory reads only published records through database views. Contact and test-drive submissions use a validated server route and are saved as customer/inquiry or test-drive records with the server-only service role key. A small in-memory request limiter is suitable only for local development; production deployment should use a durable rate limiter. Vehicle saves currently live in the visitor's browser storage and do not sync across devices or accounts.

## Administration

Staff sign in at `/admin/login` with a Supabase Auth account linked to an active `employee` row with the `admin` or `manager` role. The admin area checks the session and role server-side; RLS remains the database boundary. It includes aggregate metrics, inventory status controls, create/edit/delete, publishing, and photo upload. Create a Supabase Auth user and corresponding employee record through a trusted administrative process before staff can sign in. Never seed a real administrator password or service-role key in the repository.

See [docs/admin-bootstrap.md](docs/admin-bootstrap.md) for the first administrator setup steps.

## Source layout

- `src/app/` — App Router pages and layouts
- `src/components/` — shared UI and feature components
- `src/lib/supabase/` — browser, server, and privileged Supabase clients
- `src/lib/database/` — planned database access and types
- `src/lib/validations/` — planned request validation schemas
- `scripts/` — data processing and import commands
- `supabase/migrations/` — deployable PostgreSQL migrations
- `database/` — schema snapshot and ER documentation
- `docs/` — architecture and schema documentation
