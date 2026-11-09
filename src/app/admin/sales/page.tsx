import { ArrowUpRight, HandCoins } from "lucide-react";
import { AdminShell } from "@/components/dashboard/admin-shell";
import { RecordStatusSelect } from "@/components/dashboard/record-status-select";
import { DemoRecordBadge } from "@/components/dashboard/demo-record-badge";
import { OperationsCreateForm } from "@/components/forms/operations-create-form";
import { requireStaff } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

const statuses = ["pending", "completed", "cancelled", "refunded"];
export default async function SalesPage() {
  const staff = await requireStaff();
  const supabase = await createClient();
  const [salesResult, vehiclesResult, customersResult] = await Promise.all([
    supabase.from("sale").select("id,vehicle_id,buyer_customer_id,sale_date,sale_price,currency,status,assigned_employee_id,is_demo").order("created_at", { ascending: false }).limit(100),
    supabase.from("vehicle").select("id,model_year,status,is_demo,make:make_id(name),model:model_id(name)").order("model_year", { ascending: false }).limit(500),
    supabase.from("customer").select("id,first_name,last_name,email,is_demo").order("created_at", { ascending: false }).limit(500),
  ]);
  const vehicles = new Map((vehiclesResult.data ?? []).map((row: any) => [row.id, row]));
  const customers = new Map((customersResult.data ?? []).map((row: any) => [row.id, row]));
  const vehicleOptions = (vehiclesResult.data ?? []).filter((v: any) => !v.is_demo && ["available", "reserved"].includes(v.status)).map((v: any) => ({ id: v.id, label: `${v.model_year} ${v.make?.name ?? ""} ${v.model?.name ?? ""}` }));
  const customerOptions = (customersResult.data ?? []).filter((c: any) => !c.is_demo).map((c: any) => ({ id: c.id, label: `${c.first_name} ${c.last_name} — ${c.email}` }));
  return <AdminShell staffName={`${staff.firstName} ${staff.lastName}`} role={staff.role}><main className="admin-content"><div className="admin-page-title"><div><span className="eyebrow">VEHICLE TRANSACTIONS</span><h1>Sales & payments.</h1></div><a className="admin-action" href="/admin/vehicles">Inventory <ArrowUpRight size={14} /></a></div>{salesResult.error && <div className="admin-alert">Sales records are unavailable.</div>}<section className="admin-form-card"><span className="eyebrow">RECORD A SALE</span><p>Completed sales automatically mark the vehicle as sold. Pending sales reserve the vehicle.</p><OperationsCreateForm resource="sales" vehicles={vehicleOptions} customers={customerOptions} /></section>{salesResult.data?.length ? <section className="admin-recent-card admin-inventory-card"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Vehicle</th><th>Buyer</th><th>Sale date</th><th>Price</th><th>Payment records</th><th>Status</th></tr></thead><tbody>{salesResult.data.map((sale) => { const vehicle: any = vehicles.get(sale.vehicle_id); const customer: any = customers.get(sale.buyer_customer_id); return <tr key={sale.id}><td>{vehicle ? `${vehicle.model_year} ${vehicle.make?.name} ${vehicle.model?.name}` : "Vehicle record"}</td><td>{customer ? `${customer.first_name} ${customer.last_name}` : "Customer record"}</td><td>{sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : "Pending"}</td><td>{new Intl.NumberFormat("en-US", { style: "currency", currency: sale.currency, maximumFractionDigits: 0 }).format(Number(sale.sale_price))}</td><td><a href={`/admin/sales/${sale.id}`}>Manage payments <ArrowUpRight size={12} /></a></td><td><RecordStatusSelect resource="sales" id={sale.id} value={sale.status} values={statuses} />{sale.is_demo && <DemoRecordBadge />}</td></tr>; })}</tbody></table></div></section> : !salesResult.error && <div className="admin-empty-state"><HandCoins size={22} /><h2>No sales recorded yet.</h2><p>Record a sale with the form above.</p></div>}</main></AdminShell>;
}
