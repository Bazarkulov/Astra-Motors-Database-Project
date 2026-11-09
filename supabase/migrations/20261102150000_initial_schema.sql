-- Initial dealership schema for Supabase PostgreSQL.
-- Apply with Supabase CLI: supabase db push (after linking a project).

begin;

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.vehicle_status as enum ('draft', 'available', 'reserved', 'sold', 'unavailable');
create type public.inquiry_status as enum ('new', 'contacted', 'in_progress', 'completed', 'cancelled');
create type public.test_drive_status as enum ('requested', 'scheduled', 'completed', 'cancelled', 'no_show');
create type public.inspection_result as enum ('passed', 'passed_with_notes', 'failed', 'pending');
create type public.consignment_status as enum ('draft', 'active', 'pending_sale', 'sold', 'withdrawn', 'expired');
create type public.sale_status as enum ('pending', 'completed', 'cancelled', 'refunded');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded', 'void');
create type public.finance_application_status as enum ('submitted', 'under_review', 'approved', 'declined', 'withdrawn');
create type public.shipment_status as enum ('pending', 'scheduled', 'in_transit', 'delivered', 'cancelled');

create table public.customer (
  id uuid primary key default extensions.gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text not null,
  email_normalized text not null unique,
  phone text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_first_name_nonempty check (length(trim(first_name)) > 0),
  constraint customer_last_name_nonempty check (length(trim(last_name)) > 0),
  constraint customer_email_nonempty check (length(trim(email)) > 0),
  constraint customer_email_normalized check (email_normalized = lower(trim(email)))
);

create table public.employee (
  id uuid primary key default extensions.gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text not null unique,
  role text not null default 'sales',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint employee_role_allowed check (role in ('admin', 'manager', 'sales', 'inspector'))
);

-- Private schema helper: only active employees with the admin or manager role
-- can read and mutate operational records.
create function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.employee e
    where e.auth_user_id = (select auth.uid())
      and e.is_active
      and e.role in ('admin', 'manager')
  );
$$;
revoke all on function private.is_staff() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_staff() to authenticated;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.set_updated_at() from public;
grant execute on function private.set_updated_at() to authenticated, service_role;

create table public.make (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null unique,
  normalized_name text not null unique,
  created_at timestamptz not null default now(),
  constraint make_name_nonempty check (length(trim(name)) > 0)
);

create table public.model (
  id uuid primary key default extensions.gen_random_uuid(),
  make_id uuid not null references public.make(id) on delete restrict,
  name text not null,
  normalized_name text not null,
  category text,
  created_at timestamptz not null default now(),
  constraint model_name_nonempty check (length(trim(name)) > 0),
  constraint model_make_normalized_unique unique (make_id, normalized_name),
  constraint model_id_make_unique unique (id, make_id)
);

create table public.vehicle (
  id uuid primary key default extensions.gen_random_uuid(),
  make_id uuid not null references public.make(id) on delete restrict,
  model_id uuid not null,
  model_year smallint not null,
  trim text,
  vin text unique,
  mileage integer,
  mileage_unit text not null default 'mi',
  asking_price numeric(14,2),
  currency char(3) not null default 'USD',
  status public.vehicle_status not null default 'draft',
  category text,
  body_style text,
  transmission text,
  fuel_type text,
  engine text,
  horsepower integer,
  exterior_color text,
  interior_color text,
  description text,
  is_featured boolean not null default false,
  public_vin boolean not null default false,
  published_at timestamptz,
  source_dataset text,
  original_record_id text,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_model_make_fk foreign key (model_id, make_id)
    references public.model(id, make_id) on delete restrict,
  constraint vehicle_year_valid check (model_year between 1886 and 2100),
  constraint vehicle_mileage_nonnegative check (mileage is null or mileage >= 0),
  constraint vehicle_mileage_unit_allowed check (mileage_unit in ('mi', 'km')),
  constraint vehicle_price_nonnegative check (asking_price is null or asking_price >= 0),
  constraint vehicle_currency_iso check (currency ~ '^[A-Z]{3}$'),
  constraint vehicle_horsepower_positive check (horsepower is null or horsepower > 0),
  constraint vehicle_provenance_complete check (
    (source_dataset is null and original_record_id is null and imported_at is null)
    or (source_dataset is not null and original_record_id is not null and imported_at is not null)
  ),
  constraint vehicle_source_record_unique unique (source_dataset, original_record_id)
);

create table public.vehicle_photo (
  id uuid primary key default extensions.gen_random_uuid(),
  vehicle_id uuid not null references public.vehicle(id) on delete cascade,
  storage_path text not null unique,
  alt_text text,
  caption text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint vehicle_photo_sort_nonnegative check (sort_order >= 0)
);

create unique index vehicle_photo_one_primary_per_vehicle
  on public.vehicle_photo(vehicle_id) where is_primary;

create table public.vehicle_document (
  id uuid primary key default extensions.gen_random_uuid(),
  vehicle_id uuid not null references public.vehicle(id) on delete cascade,
  storage_path text not null unique,
  document_type text not null,
  title text,
  uploaded_by uuid references public.employee(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint vehicle_document_type_nonempty check (length(trim(document_type)) > 0)
);

create table public.inspection (
  id uuid primary key default extensions.gen_random_uuid(),
  vehicle_id uuid not null references public.vehicle(id) on delete cascade,
  inspector_id uuid references public.employee(id) on delete set null,
  inspection_date date not null default current_date,
  result public.inspection_result not null default 'pending',
  notes text,
  document_id uuid references public.vehicle_document(id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.inquiry (
  id uuid primary key default extensions.gen_random_uuid(),
  customer_id uuid not null references public.customer(id) on delete restrict,
  vehicle_id uuid references public.vehicle(id) on delete set null,
  assigned_employee_id uuid references public.employee(id) on delete set null,
  subject text,
  message text not null,
  status public.inquiry_status not null default 'new',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inquiry_message_nonempty check (length(trim(message)) > 0)
);

create table public.test_drive (
  id uuid primary key default extensions.gen_random_uuid(),
  customer_id uuid not null references public.customer(id) on delete restrict,
  vehicle_id uuid not null references public.vehicle(id) on delete restrict,
  assigned_employee_id uuid references public.employee(id) on delete set null,
  requested_at timestamptz not null default now(),
  scheduled_at timestamptz,
  status public.test_drive_status not null default 'requested',
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  constraint test_drive_scheduled_after_request check (scheduled_at is null or scheduled_at >= requested_at)
);

create table public.consignment (
  id uuid primary key default extensions.gen_random_uuid(),
  vehicle_id uuid not null references public.vehicle(id) on delete restrict,
  seller_customer_id uuid not null references public.customer(id) on delete restrict,
  agreement_date date not null,
  asking_price numeric(14,2) not null,
  currency char(3) not null default 'USD',
  commission_rate numeric(5,2) not null,
  status public.consignment_status not null default 'draft',
  agreement_document_id uuid references public.vehicle_document(id) on delete set null,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consignment_price_positive check (asking_price > 0),
  constraint consignment_commission_valid check (commission_rate >= 0 and commission_rate <= 100),
  constraint consignment_currency_iso check (currency ~ '^[A-Z]{3}$')
);

create unique index consignment_one_active_per_vehicle
  on public.consignment(vehicle_id)
  where status in ('active', 'pending_sale');

create table public.sale (
  id uuid primary key default extensions.gen_random_uuid(),
  vehicle_id uuid not null references public.vehicle(id) on delete restrict,
  buyer_customer_id uuid not null references public.customer(id) on delete restrict,
  assigned_employee_id uuid references public.employee(id) on delete set null,
  sale_date timestamptz,
  sale_price numeric(14,2) not null,
  currency char(3) not null default 'USD',
  status public.sale_status not null default 'pending',
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sale_price_positive check (sale_price > 0),
  constraint sale_currency_iso check (currency ~ '^[A-Z]{3}$'),
  constraint sale_completed_requires_date check (status <> 'completed' or sale_date is not null)
);

create unique index sale_one_active_per_vehicle
  on public.sale(vehicle_id)
  where status in ('pending', 'completed');

create table public.payment (
  id uuid primary key default extensions.gen_random_uuid(),
  sale_id uuid not null references public.sale(id) on delete restrict,
  amount numeric(14,2) not null,
  currency char(3) not null default 'USD',
  payment_method text,
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  external_reference text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  constraint payment_amount_positive check (amount > 0),
  constraint payment_currency_iso check (currency ~ '^[A-Z]{3}$')
);

create table public.lender (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null unique,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now(),
  constraint lender_name_nonempty check (length(trim(name)) > 0)
);

create table public.finance_application (
  id uuid primary key default extensions.gen_random_uuid(),
  customer_id uuid not null references public.customer(id) on delete restrict,
  sale_id uuid unique references public.sale(id) on delete set null,
  lender_id uuid references public.lender(id) on delete set null,
  status public.finance_application_status not null default 'submitted',
  requested_amount numeric(14,2),
  currency char(3) not null default 'USD',
  private_document_path text,
  is_demo boolean not null default false,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_amount_positive check (requested_amount is null or requested_amount > 0),
  constraint finance_currency_iso check (currency ~ '^[A-Z]{3}$')
);

create table public.carrier (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null unique,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now(),
  constraint carrier_name_nonempty check (length(trim(name)) > 0)
);

create table public.shipment (
  id uuid primary key default extensions.gen_random_uuid(),
  sale_id uuid not null unique references public.sale(id) on delete restrict,
  carrier_id uuid not null references public.carrier(id) on delete restrict,
  status public.shipment_status not null default 'pending',
  scheduled_pickup_at timestamptz,
  delivered_at timestamptz,
  tracking_reference text,
  pickup_address text,
  delivery_address text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipment_delivery_after_pickup check (
    delivered_at is null or scheduled_pickup_at is null or delivered_at >= scheduled_pickup_at
  )
);

create table public.favorite (
  id uuid primary key default extensions.gen_random_uuid(),
  customer_id uuid not null references public.customer(id) on delete cascade,
  vehicle_id uuid not null references public.vehicle(id) on delete cascade,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  constraint favorite_customer_vehicle_unique unique (customer_id, vehicle_id)
);

create function public.admin_record_sale(
  p_vehicle_id uuid,
  p_buyer_customer_id uuid,
  p_employee_id uuid,
  p_sale_date timestamptz,
  p_sale_price numeric,
  p_status public.sale_status,
  p_notes text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  new_sale_id uuid;
  current_vehicle_status public.vehicle_status;
begin
  if not private.is_staff() then
    raise exception 'Staff access required';
  end if;
  select status into current_vehicle_status from public.vehicle where id = p_vehicle_id for update;
  if current_vehicle_status is null or current_vehicle_status not in ('available', 'reserved') then
    raise exception 'Vehicle is not available for sale';
  end if;
  insert into public.sale (vehicle_id, buyer_customer_id, assigned_employee_id, sale_date, sale_price, status, notes)
  values (p_vehicle_id, p_buyer_customer_id, p_employee_id, p_sale_date, p_sale_price, p_status, p_notes)
  returning id into new_sale_id;
  update public.vehicle
    set status = case when p_status = 'completed' then 'sold'::public.vehicle_status else 'reserved'::public.vehicle_status end
    where id = p_vehicle_id;
  return new_sale_id;
end;
$$;
revoke all on function public.admin_record_sale(uuid, uuid, uuid, timestamptz, numeric, public.sale_status, text) from public;
grant execute on function public.admin_record_sale(uuid, uuid, uuid, timestamptz, numeric, public.sale_status, text) to authenticated;

create function public.admin_update_sale_status(p_sale_id uuid, p_status public.sale_status)
returns void
language plpgsql
set search_path = ''
as $$
declare
  linked_vehicle_id uuid;
begin
  if not private.is_staff() then
    raise exception 'Staff access required';
  end if;
  update public.sale set status = p_status,
    sale_date = case when p_status = 'completed' then coalesce(sale_date, now()) else sale_date end
    where id = p_sale_id returning vehicle_id into linked_vehicle_id;
  if linked_vehicle_id is null then
    raise exception 'Sale not found';
  end if;
  update public.vehicle
    set status = case
      when p_status = 'completed' then 'sold'::public.vehicle_status
      when p_status = 'pending' then 'reserved'::public.vehicle_status
      else 'available'::public.vehicle_status
    end
    where id = linked_vehicle_id;
end;
$$;
revoke all on function public.admin_update_sale_status(uuid, public.sale_status) from public;
grant execute on function public.admin_update_sale_status(uuid, public.sale_status) to authenticated;

create trigger customer_set_updated_at before update on public.customer
  for each row execute function private.set_updated_at();
create trigger vehicle_set_updated_at before update on public.vehicle
  for each row execute function private.set_updated_at();
create trigger inquiry_set_updated_at before update on public.inquiry
  for each row execute function private.set_updated_at();
create trigger consignment_set_updated_at before update on public.consignment
  for each row execute function private.set_updated_at();
create trigger sale_set_updated_at before update on public.sale
  for each row execute function private.set_updated_at();
create trigger finance_application_set_updated_at before update on public.finance_application
  for each row execute function private.set_updated_at();
create trigger shipment_set_updated_at before update on public.shipment
  for each row execute function private.set_updated_at();

-- Supabase Storage buckets: public listing photos and private business documents.
insert into storage.buckets (id, name, public)
values ('vehicle-photos', 'vehicle-photos', true),
       ('vehicle-documents', 'vehicle-documents', false)
on conflict (id) do update set public = excluded.public;

create policy "anyone reads listing photos" on storage.objects
  for select to anon, authenticated using (bucket_id = 'vehicle-photos');
create policy "staff uploads listing photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'vehicle-photos' and private.is_staff());
create policy "staff updates listing photos" on storage.objects
  for update to authenticated using (bucket_id = 'vehicle-photos' and private.is_staff())
  with check (bucket_id = 'vehicle-photos' and private.is_staff());
create policy "staff deletes listing photos" on storage.objects
  for delete to authenticated using (bucket_id = 'vehicle-photos' and private.is_staff());
create policy "staff reads vehicle documents" on storage.objects
  for select to authenticated using (bucket_id = 'vehicle-documents' and private.is_staff());
create policy "staff uploads vehicle documents" on storage.objects
  for insert to authenticated with check (bucket_id = 'vehicle-documents' and private.is_staff());
create policy "staff updates vehicle documents" on storage.objects
  for update to authenticated using (bucket_id = 'vehicle-documents' and private.is_staff())
  with check (bucket_id = 'vehicle-documents' and private.is_staff());
create policy "staff deletes vehicle documents" on storage.objects
  for delete to authenticated using (bucket_id = 'vehicle-documents' and private.is_staff());

-- Indexes for listing queries, operational queues, and common joins.
create index vehicle_public_browse_idx on public.vehicle(status, published_at desc, created_at desc);
create index vehicle_make_model_idx on public.vehicle(make_id, model_id);
create index vehicle_year_price_idx on public.vehicle(model_year, asking_price);
create index vehicle_category_idx on public.vehicle(category);
create index vehicle_mileage_idx on public.vehicle(mileage);
create index vehicle_search_text_idx on public.vehicle using gin (
  to_tsvector('simple', coalesce(description, '') || ' ' || coalesce(trim, '') || ' ' || coalesce(engine, ''))
);
create index vehicle_photo_gallery_idx on public.vehicle_photo(vehicle_id, sort_order);
create index vehicle_document_vehicle_idx on public.vehicle_document(vehicle_id);
create index inspection_vehicle_date_idx on public.inspection(vehicle_id, inspection_date desc);
create index inquiry_status_date_idx on public.inquiry(status, created_at desc);
create index inquiry_customer_idx on public.inquiry(customer_id, created_at desc);
create index inquiry_vehicle_idx on public.inquiry(vehicle_id, created_at desc);
create index test_drive_schedule_idx on public.test_drive(status, scheduled_at);
create index test_drive_customer_idx on public.test_drive(customer_id, requested_at desc);
create index test_drive_vehicle_idx on public.test_drive(vehicle_id, requested_at desc);
create index consignment_status_idx on public.consignment(status, agreement_date desc);
create index consignment_seller_idx on public.consignment(seller_customer_id, agreement_date desc);
create index sale_status_date_idx on public.sale(status, sale_date desc);
create index sale_buyer_idx on public.sale(buyer_customer_id, sale_date desc);
create index payment_sale_idx on public.payment(sale_id, created_at desc);
create index finance_customer_idx on public.finance_application(customer_id, submitted_at desc);
create index shipment_status_idx on public.shipment(status, scheduled_pickup_at);
create index favorite_vehicle_idx on public.favorite(vehicle_id);

-- Public catalog access is read-only and limited to published, saleable listings.
-- Use explicit views so internal VIN/provenance and inspection notes/documents
-- cannot leak through a broad SELECT on the base tables.
create view public.public_vehicle
as
select
  v.id, v.make_id, v.model_id, v.model_year, v.trim,
  case when v.public_vin then v.vin else null end as vin,
  v.mileage, v.mileage_unit, v.asking_price, v.currency, v.status,
  v.category, v.body_style, v.transmission, v.fuel_type, v.engine,
  v.horsepower, v.exterior_color, v.interior_color, v.description, v.is_featured,
  v.published_at, v.created_at, v.updated_at,
  mk.name as make_name, mo.name as model_name, mo.category as model_category,
  concat_ws(' ', v.model_year::text, mk.name, mo.name, v.trim, v.engine, v.description) as search_text
from public.vehicle v
join public.make mk on mk.id = v.make_id
join public.model mo on mo.id = v.model_id
where v.status in ('available', 'reserved', 'sold') and v.published_at is not null;

create view public.public_inspection_summary
as
select i.id, i.vehicle_id, i.inspection_date, i.result
from public.inspection i
where i.result <> 'pending'
  and exists (select 1 from public.public_vehicle v where v.id = i.vehicle_id);

create view public.admin_dashboard_summary
with (security_invoker = true)
as
select jsonb_build_object(
  'totals', jsonb_build_object(
    'vehicles', (select count(*) from public.vehicle),
    'available_vehicles', (select count(*) from public.vehicle where status = 'available'),
    'sold_vehicles', (select count(*) from public.vehicle where status = 'sold'),
    'active_consignments', (select count(*) from public.consignment where not is_demo and status in ('active', 'pending_sale')),
    'customers', (select count(*) from public.customer where not is_demo),
    'pending_inquiries', (select count(*) from public.inquiry where not is_demo and status in ('new', 'contacted', 'in_progress')),
    'scheduled_test_drives', (select count(*) from public.test_drive where not is_demo and status = 'scheduled')
  ),
  'inventory_by_status', coalesce((
    select jsonb_agg(jsonb_build_object('status', grouped.status, 'count', grouped.count))
    from (select status::text, count(*) from public.vehicle group by status order by status) grouped
  ), '[]'::jsonb),
  'monthly_sales', coalesce((
    select jsonb_agg(jsonb_build_object('month', grouped.month, 'sales', grouped.sales, 'revenue', grouped.revenue) order by grouped.month)
    from (
      select date_trunc('month', sale_date)::date as month, count(*) as sales, sum(sale_price) as revenue
      from public.sale
      where not is_demo and status = 'completed' and sale_date >= date_trunc('month', now()) - interval '5 months'
      group by date_trunc('month', sale_date)
    ) grouped
  ), '[]'::jsonb),
  'inquiries_by_status', coalesce((
    select jsonb_agg(jsonb_build_object('status', grouped.status, 'count', grouped.count))
    from (select status::text, count(*) from public.inquiry where not is_demo group by status order by status) grouped
  ), '[]'::jsonb),
  'price_bands', coalesce((
    select jsonb_agg(jsonb_build_object('band', grouped.band, 'count', grouped.count) order by grouped.band)
    from (
      select case
        when asking_price < 25000 then 'Under $25k'
        when asking_price < 50000 then '$25k–$50k'
        when asking_price < 100000 then '$50k–$100k'
        when asking_price < 250000 then '$100k–$250k'
        else '$250k+'
      end as band,
      case
        when asking_price < 25000 then 1
        when asking_price < 50000 then 2
        when asking_price < 100000 then 3
        when asking_price < 250000 then 4
        else 5
      end as band_order,
      count(*)
      from public.vehicle where asking_price is not null group by band, band_order
    ) grouped
  ), '[]'::jsonb),
  'recent_sales', coalesce((
    select jsonb_agg(jsonb_build_object(
      'sale_id', s.id, 'sale_date', s.sale_date, 'sale_price', s.sale_price, 'currency', s.currency,
      'vehicle', concat_ws(' ', v.model_year, mk.name, mo.name),
      'buyer', concat_ws(' ', c.first_name, c.last_name)
    ) order by s.sale_date desc)
    from (
      select * from public.sale where not is_demo and status = 'completed' order by sale_date desc limit 6
    ) s
    join public.vehicle v on v.id = s.vehicle_id
    join public.make mk on mk.id = v.make_id
    join public.model mo on mo.id = v.model_id
    join public.customer c on c.id = s.buyer_customer_id
  ), '[]'::jsonb)
) as data
where private.is_staff();

create view public.admin_customer_activity
with (security_invoker = true)
as
select c.id as customer_id,
  (select count(*) from public.inquiry i where i.customer_id = c.id and not i.is_demo) as inquiry_count,
  (select count(*) from public.test_drive td where td.customer_id = c.id and not td.is_demo) as test_drive_count,
  (select count(*) from public.sale s where s.buyer_customer_id = c.id and not s.is_demo and s.status = 'completed') as purchase_count
from public.customer c
where not c.is_demo and private.is_staff();

create policy "public reads photos for published vehicles" on public.vehicle_photo for select to anon, authenticated
  using (exists (select 1 from public.public_vehicle v where v.id = vehicle_id));

grant select on public.make, public.model, public.vehicle_photo,
  public.public_vehicle, public.public_inspection_summary to anon, authenticated;
grant select on public.admin_dashboard_summary to authenticated;
grant select on public.admin_customer_activity to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

alter table public.make enable row level security;
alter table public.model enable row level security;
alter table public.vehicle enable row level security;
alter table public.vehicle_photo enable row level security;
alter table public.vehicle_document enable row level security;
alter table public.inspection enable row level security;
alter table public.customer enable row level security;
alter table public.employee enable row level security;
alter table public.inquiry enable row level security;
alter table public.test_drive enable row level security;
alter table public.consignment enable row level security;
alter table public.sale enable row level security;
alter table public.payment enable row level security;
alter table public.lender enable row level security;
alter table public.finance_application enable row level security;
alter table public.carrier enable row level security;
alter table public.shipment enable row level security;
alter table public.favorite enable row level security;

create policy "public reads makes" on public.make for select to anon, authenticated using (true);
create policy "staff manages makes" on public.make for all to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "public reads models" on public.model for select to anon, authenticated using (true);
create policy "staff manages models" on public.model for all to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "staff manages vehicles" on public.vehicle for all to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "staff manages photos" on public.vehicle_photo for all to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "staff manages documents" on public.vehicle_document for all to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "staff manages inspections" on public.inspection for all to authenticated using (private.is_staff()) with check (private.is_staff());

-- Public writes are intentionally handled through validated server-side routes
-- using narrowly scoped RPCs in a later migration; customer data stays private.
create policy "staff manages customers" on public.customer for all to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "staff reads employees" on public.employee for select to authenticated using (private.is_staff());
create policy "staff manages employees" on public.employee for all to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "staff manages inquiries" on public.inquiry for all to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "staff manages test drives" on public.test_drive for all to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "staff manages consignments" on public.consignment for all to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "staff manages sales" on public.sale for all to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "staff manages payments" on public.payment for all to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "staff manages lenders" on public.lender for all to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "staff manages finance applications" on public.finance_application for all to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "staff manages carriers" on public.carrier for all to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "staff manages shipments" on public.shipment for all to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "staff manages favorites" on public.favorite for all to authenticated using (private.is_staff()) with check (private.is_staff());

-- No anonymous/authenticated table access is granted by default to private
-- operational tables; only staff policies grant authenticated access.
revoke all on public.customer, public.employee, public.vehicle, public.vehicle_document,
  public.inquiry, public.test_drive, public.consignment, public.sale,
  public.payment, public.lender, public.finance_application, public.carrier,
  public.shipment, public.favorite from anon;

commit;
