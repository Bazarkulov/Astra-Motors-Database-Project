-- Extend demo-data isolation to inventory and lookup records.
begin;

alter table public.vehicle add column if not exists is_demo boolean not null default false;
alter table public.lender add column if not exists is_demo boolean not null default false;
alter table public.carrier add column if not exists is_demo boolean not null default false;

create or replace view public.public_vehicle
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
where v.status in ('available', 'reserved', 'sold')
  and v.published_at is not null
  and not v.is_demo;

create view public.admin_demo_record_counts
with (security_invoker = true)
as
select jsonb_build_object(
  'vehicles', (select count(*) from public.vehicle where is_demo),
  'customers', (select count(*) from public.customer where is_demo),
  'inquiries', (select count(*) from public.inquiry where is_demo),
  'test_drives', (select count(*) from public.test_drive where is_demo),
  'inspections', (select count(*) from public.inspection where is_demo),
  'consignments', (select count(*) from public.consignment where is_demo),
  'sales', (select count(*) from public.sale where is_demo),
  'payments', (select count(*) from public.payment where is_demo),
  'finance_applications', (select count(*) from public.finance_application where is_demo),
  'shipments', (select count(*) from public.shipment where is_demo),
  'favorites', (select count(*) from public.favorite where is_demo),
  'lenders', (select count(*) from public.lender where is_demo),
  'carriers', (select count(*) from public.carrier where is_demo)
) as data
where private.is_staff();

grant select on public.admin_demo_record_counts to authenticated;

create or replace view public.admin_dashboard_summary
with (security_invoker = true)
as
select jsonb_build_object(
  'totals', jsonb_build_object(
    'vehicles', (select count(*) from public.vehicle where not is_demo),
    'available_vehicles', (select count(*) from public.vehicle where not is_demo and status = 'available'),
    'sold_vehicles', (select count(*) from public.vehicle where not is_demo and status = 'sold'),
    'active_consignments', (select count(*) from public.consignment where not is_demo and status in ('active', 'pending_sale')),
    'customers', (select count(*) from public.customer where not is_demo),
    'pending_inquiries', (select count(*) from public.inquiry where not is_demo and status in ('new', 'contacted', 'in_progress')),
    'scheduled_test_drives', (select count(*) from public.test_drive where not is_demo and status = 'scheduled')
  ),
  'inventory_by_status', coalesce((
    select jsonb_agg(jsonb_build_object('status', grouped.status, 'count', grouped.count))
    from (select status::text, count(*) from public.vehicle where not is_demo group by status order by status) grouped
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
      from public.vehicle where not is_demo and asking_price is not null group by band, band_order
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

create or replace view public.admin_customer_activity
with (security_invoker = true)
as
select c.id as customer_id,
  (select count(*) from public.inquiry i where i.customer_id = c.id) as inquiry_count,
  (select count(*) from public.test_drive td where td.customer_id = c.id) as test_drive_count,
  (select count(*) from public.sale s where s.buyer_customer_id = c.id and s.status = 'completed') as purchase_count
from public.customer c
where private.is_staff();

commit;
