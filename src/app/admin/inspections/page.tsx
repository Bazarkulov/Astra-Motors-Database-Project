import { ClipboardCheck } from "lucide-react";
import { AdminShell } from "@/components/dashboard/admin-shell";
import { RecordStatusSelect } from "@/components/dashboard/record-status-select";
import { DemoRecordBadge } from "@/components/dashboard/demo-record-badge";
import { OperationsCreateForm } from "@/components/forms/operations-create-form";
import { requireStaff } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

const results = ["pending", "passed", "passed_with_notes", "failed"];
export default async function InspectionsPage() {
  const staff = await requireStaff();
  const supabase = await createClient();
  const [inspectionsResult, vehiclesResult] = await Promise.all([
    supabase.from("inspection").select("id,vehicle_id,inspection_date,result,notes,inspector_id,is_demo").order("inspection_date", { ascending: false }).limit(100),
    supabase.from("vehicle").select("id,model_year,is_demo,make:make_id(name),model:model_id(name)").order("model_year", { ascending: false }).limit(500),
  ]);
  const vehicles = new Map((vehiclesResult.data ?? []).map((row: any) => [row.id, row]));
  const vehicleOptions = (vehiclesResult.data ?? []).filter((v: any) => !v.is_demo).map((v: any) => ({ id: v.id, label: `${v.model_year} ${v.make?.name ?? ""} ${v.model?.name ?? ""}` }));
  return <AdminShell staffName={`${staff.firstName} ${staff.lastName}`} role={staff.role}><main className="admin-content"><div className="admin-page-title"><div><span className="eyebrow">CONDITION & DOCUMENTATION</span><h1>Inspections.</h1></div></div>{inspectionsResult.error && <div className="admin-alert">Inspection records are unavailable.</div>}<section className="admin-form-card"><span className="eyebrow">RECORD AN INSPECTION</span><p>Record findings as observed. Attachments can be managed with vehicle documents in a later release.</p><OperationsCreateForm resource="inspections" vehicles={vehicleOptions} /></section>{inspectionsResult.data?.length ? <section className="admin-recent-card admin-inventory-card"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Vehicle</th><th>Inspection date</th><th>Result</th><th>Notes</th></tr></thead><tbody>{inspectionsResult.data.map((inspection) => { const vehicle: any = vehicles.get(inspection.vehicle_id); return <tr key={inspection.id}><td>{vehicle ? `${vehicle.model_year} ${vehicle.make?.name} ${vehicle.model?.name}` : "Vehicle record"}</td><td>{inspection.inspection_date}</td><td><RecordStatusSelect resource="inspections" id={inspection.id} value={inspection.result} values={results} />{inspection.is_demo && <DemoRecordBadge />}</td><td className="message-cell">{inspection.notes ?? "—"}</td></tr>; })}</tbody></table></div></section> : !inspectionsResult.error && <div className="admin-empty-state"><ClipboardCheck size={22} /><h2>No inspection records.</h2><p>Use the form to record the first inspection.</p></div>}</main></AdminShell>;
}
