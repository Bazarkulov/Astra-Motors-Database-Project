import { ArrowUpRight, CarFront, CircleDollarSign, Clock3, MessageCircle, Users, CalendarCheck, ScrollText } from "lucide-react";
import { AdminCharts } from "@/components/dashboard/admin-charts";
import { AdminShell } from "@/components/dashboard/admin-shell";
import { requireStaff } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

const emptySummary = {
  totals: { vehicles: 0, available_vehicles: 0, sold_vehicles: 0, active_consignments: 0, customers: 0, pending_inquiries: 0, scheduled_test_drives: 0 },
  inventory_by_status: [], monthly_sales: [], inquiries_by_status: [], price_bands: [], recent_sales: [],
};

export default async function AdminOverviewPage() {
  const staff = await requireStaff();
  let summary: typeof emptySummary = emptySummary;
  let demoRecordTotal = 0;
  let error: string | null = null;
  try {
    const supabase = await createClient();
    const [{ data, error: queryError }, { data: demoData }] = await Promise.all([
      supabase.from("admin_dashboard_summary").select("data").maybeSingle(),
      supabase.from("admin_demo_record_counts").select("data").maybeSingle(),
    ]);
    if (queryError) error = "Dashboard data is unavailable. Apply the latest database migration and check staff access.";
    else if (data?.data) summary = data.data as typeof emptySummary;
    if (demoData?.data) demoRecordTotal = Object.values(demoData.data as Record<string, number>).reduce((sum, count) => sum + Number(count), 0);
  } catch {
    error = "Connect Supabase and apply the database migration to view live analytics.";
  }

  const totals = summary.totals;
  const metrics = [
    ["Total vehicles", totals.vehicles, CarFront, "/admin/vehicles"],
    ["Available", totals.available_vehicles, CircleDollarSign, "/admin/vehicles?status=available"],
    ["Sold", totals.sold_vehicles, CarFront, "/admin/sales"],
    ["Active consignments", totals.active_consignments, ScrollText, "/admin/consignments"],
    ["Customers", totals.customers, Users, "/admin/customers"],
    ["Pending inquiries", totals.pending_inquiries, MessageCircle, "/admin/inquiries"],
    ["Scheduled test drives", totals.scheduled_test_drives, CalendarCheck, "/admin/test-drives"],
  ] as const;

  return <AdminShell staffName={`${staff.firstName} ${staff.lastName}`} role={staff.role}><main className="admin-content"><div className="admin-page-title"><div><span className="eyebrow">{new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date()).toUpperCase()}</span><h1>Welcome,<br /><em>{staff.firstName}.</em></h1></div><a className="admin-action" href="/admin/vehicles/new">Add a vehicle <ArrowUpRight size={15} /></a></div>
    {error && <div className="admin-alert"><Clock3 size={16} />{error}</div>}
    {demoRecordTotal > 0 && <div className="admin-demo-notice"><strong>Demo records are loaded.</strong> {demoRecordTotal} clearly marked fictional records appear in admin workflows. Demo vehicles are hidden from the public catalog; dashboard metrics exclude demo records.</div>}
    <div className="metric-grid">{metrics.map(([label, value, Icon, href]) => <a className="metric-card" href={href} key={label}><div><span className="eyebrow">{label}</span><strong>{value.toLocaleString()}</strong></div><Icon size={19} /><span className="metric-link">View details <ArrowUpRight size={12} /></span></a>)}</div>
    <AdminCharts status={summary.inventory_by_status} sales={summary.monthly_sales} inquiries={summary.inquiries_by_status} priceBands={summary.price_bands} />
    <section className="admin-recent-card"><div className="admin-card-heading"><div><span className="eyebrow">LATEST COMPLETED TRANSACTIONS</span><h2>Recent sales</h2></div><a href="/admin/sales">All sales <ArrowUpRight size={13} /></a></div>{summary.recent_sales.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Vehicle</th><th>Buyer</th><th>Sale date</th><th>Sale price</th></tr></thead><tbody>{summary.recent_sales.map((sale: { sale_id: string; vehicle: string; buyer: string; sale_date: string; sale_price: number; currency: string }) => <tr key={sale.sale_id}><td>{sale.vehicle}</td><td>{sale.buyer}</td><td>{new Date(sale.sale_date).toLocaleDateString()}</td><td>{new Intl.NumberFormat("en-US", { style: "currency", currency: sale.currency, maximumFractionDigits: 0 }).format(Number(sale.sale_price))}</td></tr>)}</tbody></table></div> : <p className="admin-empty">Completed sales will appear here as they are recorded.</p>}</section>
    <p className="admin-footnote"><MessageCircle size={13} /> Dashboard metrics are calculated from dealership database records.</p>
  </main></AdminShell>;
}
