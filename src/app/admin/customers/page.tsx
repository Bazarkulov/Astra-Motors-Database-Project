import Link from "next/link";
import { ArrowUpRight, Users } from "lucide-react";
import { AdminShell } from "@/components/dashboard/admin-shell";
import { DemoRecordBadge } from "@/components/dashboard/demo-record-badge";
import { requireStaff } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function CustomersPage() {
  const staff = await requireStaff();
  const supabase = await createClient();
  const { data: customers, error } = await supabase.from("customer").select("id,first_name,last_name,email,phone,created_at,is_demo").order("created_at", { ascending: false }).limit(100);
  const ids = (customers ?? []).map((customer) => customer.id);
  const { data: activity } = ids.length
    ? await supabase.from("admin_customer_activity").select("customer_id,inquiry_count,test_drive_count,purchase_count").in("customer_id", ids)
    : { data: [] };
  const activityByCustomer = new Map((activity ?? []).map((row) => [row.customer_id, row]));
  return <AdminShell staffName={`${staff.firstName} ${staff.lastName}`} role={staff.role}><main className="admin-content"><div className="admin-page-title"><div><span className="eyebrow">CUSTOMER DIRECTORY</span><h1>The relationships.</h1></div></div>{error && <div className="admin-alert">Customer records are unavailable.</div>}{customers?.length ? <section className="admin-recent-card admin-inventory-card"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Customer</th><th>Contact</th><th>Inquiries</th><th>Test drives</th><th>Purchases</th><th>Added</th></tr></thead><tbody>{customers.map((customer) => { const activityRow = activityByCustomer.get(customer.id); return <tr key={customer.id}><td><Link className="admin-vehicle-name" href={`/admin/customers/${customer.id}`}><strong>{customer.first_name} {customer.last_name}</strong><small>Open profile <ArrowUpRight size={11} /></small></Link>{customer.is_demo && <DemoRecordBadge />}</td><td>{customer.email}<small className="admin-subline">{customer.phone ?? "Phone not provided"}</small></td><td>{activityRow?.inquiry_count ?? 0}</td><td>{activityRow?.test_drive_count ?? 0}</td><td>{activityRow?.purchase_count ?? 0}</td><td>{new Date(customer.created_at).toLocaleDateString()}</td></tr>; })}</tbody></table></div></section> : !error && <div className="admin-empty-state"><Users size={22} /><h2>No customer records yet.</h2><p>Customer details are created from public inquiries and test-drive requests.</p></div>}<p className="admin-footnote">Showing up to 100 newest customers with activity counts from database aggregates.</p></main></AdminShell>;
}
