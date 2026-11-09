import { ArrowUpRight, CalendarDays } from "lucide-react";
import { AdminShell } from "@/components/dashboard/admin-shell";
import { RecordStatusSelect } from "@/components/dashboard/record-status-select";
import { DemoRecordBadge } from "@/components/dashboard/demo-record-badge";
import { requireStaff } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

const statuses = ["requested", "scheduled", "completed", "cancelled", "no_show"];
export default async function TestDrivesPage() {
  const staff = await requireStaff();
  const supabase = await createClient();
  const { data: requests, error } = await supabase.from("test_drive").select("id,status,requested_at,scheduled_at,notes,customer_id,vehicle_id,assigned_employee_id,is_demo").order("requested_at", { ascending: false }).limit(100);
  const customerIds = [...new Set((requests ?? []).map((row) => row.customer_id))];
  const vehicleIds = [...new Set((requests ?? []).map((row) => row.vehicle_id))];
  const [customersResult, vehiclesResult, employeesResult] = await Promise.all([
    customerIds.length ? supabase.from("customer").select("id,first_name,last_name,email,phone").in("id", customerIds) : Promise.resolve({ data: [] }),
    vehicleIds.length ? supabase.from("vehicle").select("id,model_year,make:make_id(name),model:model_id(name)").in("id", vehicleIds) : Promise.resolve({ data: [] }),
    supabase.from("employee").select("id,first_name,last_name"),
  ]);
  const customers = new Map((customersResult.data ?? []).map((row: any) => [row.id, row]));
  const vehicles = new Map((vehiclesResult.data ?? []).map((row: any) => [row.id, row]));
  const employees = new Map((employeesResult.data ?? []).map((row: any) => [row.id, row]));
  return <AdminShell staffName={`${staff.firstName} ${staff.lastName}`} role={staff.role}><main className="admin-content"><div className="admin-page-title"><div><span className="eyebrow">VISITS & DRIVE REQUESTS</span><h1>Test drives.</h1></div></div>{error && <div className="admin-alert">Test-drive requests are unavailable.</div>}{requests?.length ? <section className="admin-recent-card admin-inventory-card"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Customer</th><th>Vehicle</th><th>Requested</th><th>Preferred time</th><th>Notes</th><th>Status</th></tr></thead><tbody>{requests.map((request) => { const customer: any = customers.get(request.customer_id); const vehicle: any = vehicles.get(request.vehicle_id); return <tr key={request.id}><td><strong>{customer ? `${customer.first_name} ${customer.last_name}` : "Customer unavailable"}</strong>{request.is_demo && <DemoRecordBadge />}<small className="admin-subline">{customer?.email}</small><small className="admin-subline">{customer?.phone}</small></td><td>{vehicle ? `${vehicle.model_year} ${vehicle.make?.name} ${vehicle.model?.name}` : "Vehicle unavailable"}</td><td>{new Date(request.requested_at).toLocaleString()}</td><td>{request.scheduled_at ? new Date(request.scheduled_at).toLocaleString() : "Not specified"}</td><td className="message-cell">{request.notes ?? "—"}</td><td><RecordStatusSelect resource="test-drives" id={request.id} value={request.status} values={statuses} /></td></tr>; })}</tbody></table></div></section> : !error && <div className="admin-empty-state"><CalendarDays size={22} /><h2>No test-drive requests.</h2><p>Requests submitted from vehicle details will appear here.</p><a href="/inventory" className="text-link">View inventory <ArrowUpRight size={13} /></a></div>}<p className="admin-footnote">Showing up to 100 most recent requests.</p></main></AdminShell>;
}
