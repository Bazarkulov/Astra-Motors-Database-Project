import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminShell } from "@/components/dashboard/admin-shell";
import { AdminCustomerForm } from "@/components/forms/admin-customer-form";
import { DemoRecordBadge } from "@/components/dashboard/demo-record-badge";
import { requireStaff } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(); const { id } = await params; const supabase = await createClient();
  const { data: customer, error } = await supabase.from("customer").select("id,first_name,last_name,email,phone,created_at,is_demo").eq("id", id).maybeSingle();
  const [inquiries, testDrives, sales] = customer ? await Promise.all([
    supabase.from("inquiry").select("id,subject,status,created_at,vehicle_id,is_demo").eq("customer_id", id).order("created_at", { ascending: false }).limit(30),
    supabase.from("test_drive").select("id,status,requested_at,scheduled_at,vehicle_id,is_demo").eq("customer_id", id).order("requested_at", { ascending: false }).limit(30),
    supabase.from("sale").select("id,status,sale_date,sale_price,currency,vehicle_id,is_demo").eq("buyer_customer_id", id).order("created_at", { ascending: false }).limit(30),
  ]) : [{ data: [] }, { data: [] }, { data: [] }];
  return <AdminShell staffName={`${staff.firstName} ${staff.lastName}`} role={staff.role}><main className="admin-content"><Link href="/admin/customers" className="admin-back"><ArrowLeft size={14} /> Customers</Link><div className="admin-page-title"><div><span className="eyebrow">CUSTOMER PROFILE</span><h1>{customer ? `${customer.first_name} ${customer.last_name}` : "Customer record."}</h1>{customer?.is_demo && <DemoRecordBadge />}</div></div>{error || !customer ? <div className="admin-alert">Customer record unavailable.</div> : <><AdminCustomerForm id={id} firstName={customer.first_name} lastName={customer.last_name} email={customer.email} phone={customer.phone} /><section className="activity-grid"><div className="admin-recent-card"><span className="eyebrow">INQUIRIES — {inquiries.data?.length ?? 0}</span>{inquiries.data?.map((item) => <div className="activity-row" key={item.id}><strong>{item.subject ?? "Enquiry"}</strong><span>{item.is_demo && <DemoRecordBadge />} {item.status} · {new Date(item.created_at).toLocaleDateString()}</span></div>)}</div><div className="admin-recent-card"><span className="eyebrow">TEST DRIVES — {testDrives.data?.length ?? 0}</span>{testDrives.data?.map((item) => <div className="activity-row" key={item.id}><strong>{item.scheduled_at ? new Date(item.scheduled_at).toLocaleString() : "Time not set"}</strong><span>{item.is_demo && <DemoRecordBadge />} {item.status}</span></div>)}</div><div className="admin-recent-card"><span className="eyebrow">PURCHASES — {sales.data?.length ?? 0}</span>{sales.data?.map((item) => <div className="activity-row" key={item.id}><strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: item.currency, maximumFractionDigits: 0 }).format(Number(item.sale_price))}</strong><span>{item.is_demo && <DemoRecordBadge />} {item.status} · {item.sale_date ? new Date(item.sale_date).toLocaleDateString() : "Date pending"}</span></div>)}</div></section></>}</main></AdminShell>;
}
