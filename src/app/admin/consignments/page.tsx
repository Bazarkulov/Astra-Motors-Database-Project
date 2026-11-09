import { FileText } from "lucide-react";
import { AdminShell } from "@/components/dashboard/admin-shell";
import { RecordStatusSelect } from "@/components/dashboard/record-status-select";
import { DemoRecordBadge } from "@/components/dashboard/demo-record-badge";
import { OperationsCreateForm } from "@/components/forms/operations-create-form";
import { requireStaff } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

const statuses = ["draft", "active", "pending_sale", "sold", "withdrawn", "expired"];
export default async function ConsignmentsPage() {
  const staff = await requireStaff();
  const supabase = await createClient();
  const [consignmentsResult, vehiclesResult, customersResult] = await Promise.all([
    supabase.from("consignment").select("id,vehicle_id,seller_customer_id,agreement_date,asking_price,currency,commission_rate,status,is_demo").order("agreement_date", { ascending: false }).limit(100),
    supabase.from("vehicle").select("id,model_year,is_demo,make:make_id(name),model:model_id(name)").in("status", ["available", "draft"]).order("model_year", { ascending: false }).limit(300),
    supabase.from("customer").select("id,first_name,last_name,email,is_demo").order("created_at", { ascending: false }).limit(500),
  ]);
  const vehicles = new Map((vehiclesResult.data ?? []).map((row: any) => [row.id, row]));
  const customers = new Map((customersResult.data ?? []).map((row: any) => [row.id, row]));
  const vehicleOptions = (vehiclesResult.data ?? []).filter((v: any) => !v.is_demo).map((v: any) => ({ id: v.id, label: `${v.model_year} ${v.make?.name ?? ""} ${v.model?.name ?? ""}` }));
  const customerOptions = (customersResult.data ?? []).filter((c: any) => !c.is_demo).map((c: any) => ({ id: c.id, label: `${c.first_name} ${c.last_name} — ${c.email}` }));
  return <AdminShell staffName={`${staff.firstName} ${staff.lastName}`} role={staff.role}><main className="admin-content"><div className="admin-page-title"><div><span className="eyebrow">SELLER AGREEMENTS</span><h1>Consignments.</h1></div></div>{consignmentsResult.error && <div className="admin-alert">Consignment records are unavailable.</div>}<section className="admin-form-card"><span className="eyebrow">NEW AGREEMENT</span><p>Record seller, vehicle, price and commission. Only one active agreement can exist per vehicle.</p><OperationsCreateForm resource="consignments" vehicles={vehicleOptions} customers={customerOptions} /></section>{consignmentsResult.data?.length ? <section className="admin-recent-card admin-inventory-card"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Vehicle</th><th>Seller</th><th>Agreement</th><th>Asking price</th><th>Commission</th><th>Status</th></tr></thead><tbody>{consignmentsResult.data.map((row) => { const vehicle: any = vehicles.get(row.vehicle_id); const customer: any = customers.get(row.seller_customer_id); return <tr key={row.id}><td>{vehicle ? `${vehicle.model_year} ${vehicle.make?.name} ${vehicle.model?.name}` : "Vehicle record"}</td><td>{customer ? `${customer.first_name} ${customer.last_name}` : "Customer record"}</td><td>{row.agreement_date}</td><td>{new Intl.NumberFormat("en-US", { style: "currency", currency: row.currency, maximumFractionDigits: 0 }).format(Number(row.asking_price))}</td><td>{row.commission_rate}%</td><td><RecordStatusSelect resource="consignments" id={row.id} value={row.status} values={statuses} />{row.is_demo && <DemoRecordBadge />}</td></tr>; })}</tbody></table></div></section> : !consignmentsResult.error && <div className="admin-empty-state"><FileText size={22} /><h2>No consignment records.</h2><p>Start an agreement using the form above.</p></div>}</main></AdminShell>;
}
