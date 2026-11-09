import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";
import { AdminShell } from "@/components/dashboard/admin-shell";
import { PaymentForm } from "@/components/forms/payment-form";
import { DemoRecordBadge } from "@/components/dashboard/demo-record-badge";
import { requireStaff } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function SalePaymentsPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const { data: sale, error } = await supabase.from("sale").select("id,sale_price,currency,status,sale_date,vehicle_id,buyer_customer_id,is_demo").eq("id", id).maybeSingle();
  const [{ data: payments }, { data: vehicle }, { data: buyer }] = sale ? await Promise.all([
    supabase.from("payment").select("id,amount,currency,payment_method,status,paid_at,external_reference,created_at,is_demo").eq("sale_id", id).order("created_at", { ascending: false }),
    supabase.from("vehicle").select("model_year,make:make_id(name),model:model_id(name)").eq("id", sale.vehicle_id).maybeSingle(),
    supabase.from("customer").select("first_name,last_name,email").eq("id", sale.buyer_customer_id).maybeSingle(),
  ]) : [{ data: [] }, { data: null }, { data: null }];
  return <AdminShell staffName={`${staff.firstName} ${staff.lastName}`} role={staff.role}><main className="admin-content"><Link className="admin-back" href="/admin/sales"><ArrowLeft size={14} /> Sales</Link><div className="admin-page-title"><div><span className="eyebrow">PAYMENT TRACKING</span><h1>{sale ? `${vehicle?.model_year ?? ""} ${vehicle?.make?.name ?? ""} ${vehicle?.model?.name ?? ""}` : "Sale record."}</h1>{sale?.is_demo && <DemoRecordBadge />}</div></div>{error || !sale ? <div className="admin-alert">Sale not found or unavailable.</div> : <><section className="admin-form-card payment-summary"><span className="eyebrow">SALE SUMMARY</span><div><strong>{buyer ? `${buyer.first_name} ${buyer.last_name}` : "Buyer record"}</strong><span>{sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : "Pending sale"}</span><b>{new Intl.NumberFormat("en-US", { style: "currency", currency: sale.currency, maximumFractionDigits: 0 }).format(Number(sale.sale_price))}</b><small>{sale.status}</small></div></section><PaymentForm saleId={id} />{payments?.length ? <section className="admin-recent-card admin-inventory-card"><div className="admin-card-heading"><div><span className="eyebrow">PAYMENT HISTORY</span><h2>Transactions</h2></div><CreditCard size={17} /></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Amount</th><th>Method</th><th>Status</th><th>Paid at</th><th>Reference</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td>{new Intl.NumberFormat("en-US", { style: "currency", currency: payment.currency, maximumFractionDigits: 2 }).format(Number(payment.amount))}</td><td>{payment.payment_method ?? "Not recorded"}</td><td>{payment.status}{payment.is_demo && <DemoRecordBadge />}</td><td>{payment.paid_at ? new Date(payment.paid_at).toLocaleString() : "—"}</td><td>{payment.external_reference ?? "—"}</td></tr>)}</tbody></table></div></section> : <div className="admin-empty-state"><CreditCard size={22} /><h2>No payment entries yet.</h2><p>Use the form to record a payment event.</p></div>}</>}</main></AdminShell>;
}
