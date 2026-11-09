import { ArrowUpRight, MessageCircle } from "lucide-react";
import { AdminShell } from "@/components/dashboard/admin-shell";
import { RecordStatusSelect } from "@/components/dashboard/record-status-select";
import { DemoRecordBadge } from "@/components/dashboard/demo-record-badge";
import { requireStaff } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

const statuses = ["new", "contacted", "in_progress", "completed", "cancelled"];
export default async function InquiriesPage() {
  const staff = await requireStaff();
  const supabase = await createClient();
  const { data: inquiries, error } = await supabase.from("inquiry").select("id,subject,message,status,created_at,customer_id,vehicle_id,assigned_employee_id,is_demo").order("created_at", { ascending: false }).limit(100);
  const customerIds = [...new Set((inquiries ?? []).map((row) => row.customer_id))];
  const vehicleIds = [...new Set((inquiries ?? []).flatMap((row) => row.vehicle_id ? [row.vehicle_id] : []))];
  const [customersResult, vehiclesResult, employeesResult] = await Promise.all([
    customerIds.length ? supabase.from("customer").select("id,first_name,last_name,email").in("id", customerIds) : Promise.resolve({ data: [] }),
    vehicleIds.length ? supabase.from("vehicle").select("id,model_year,make:make_id(name),model:model_id(name)").in("id", vehicleIds) : Promise.resolve({ data: [] }),
    supabase.from("employee").select("id,first_name,last_name"),
  ]);
  const customers = new Map((customersResult.data ?? []).map((row: any) => [row.id, row]));
  const vehicles = new Map((vehiclesResult.data ?? []).map((row: any) => [row.id, row]));
  const employees = new Map((employeesResult.data ?? []).map((row: any) => [row.id, row]));
  return <AdminShell staffName={`${staff.firstName} ${staff.lastName}`} role={staff.role}><main className="admin-content"><div className="admin-page-title"><div><span className="eyebrow">CUSTOMER CONVERSATIONS</span><h1>The inquiries.</h1></div></div>{error && <div className="admin-alert">Inquiries are unavailable. Check database access.</div>}{inquiries?.length ? <section className="admin-recent-card admin-inventory-card"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Customer / vehicle</th><th>Received</th><th>Message</th><th>Assigned to</th><th>Status</th></tr></thead><tbody>{inquiries.map((inquiry) => { const customer: any = customers.get(inquiry.customer_id); const vehicle: any = inquiry.vehicle_id ? vehicles.get(inquiry.vehicle_id) : null; const employee: any = inquiry.assigned_employee_id ? employees.get(inquiry.assigned_employee_id) : null; return <tr key={inquiry.id}><td><strong>{customer ? `${customer.first_name} ${customer.last_name}` : "Customer unavailable"}</strong><small className="admin-subline">{customer?.email ?? ""}</small>{vehicle && <small className="admin-subline">{vehicle.model_year} {vehicle.make?.name} {vehicle.model?.name}</small>}</td><td>{new Date(inquiry.created_at).toLocaleDateString()}</td><td className="message-cell"><strong>{inquiry.subject ?? "Enquiry"}</strong>{inquiry.is_demo && <DemoRecordBadge />}<small>{inquiry.message}</small></td><td>{employee ? `${employee.first_name} ${employee.last_name}` : "Unassigned"}</td><td><RecordStatusSelect resource="inquiries" id={inquiry.id} value={inquiry.status} values={statuses} /></td></tr>; })}</tbody></table></div></section> : !error && <div className="admin-empty-state"><MessageCircle size={22} /><h2>No inquiries yet.</h2><p>Customer messages will appear here after they are submitted.</p><a href="/" className="text-link">View the public site <ArrowUpRight size={13} /></a></div>}<p className="admin-footnote">Showing up to 100 most recent inquiries.</p></main></AdminShell>;
}
