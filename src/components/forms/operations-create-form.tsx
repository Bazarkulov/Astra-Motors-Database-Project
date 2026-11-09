"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

type Option = { id: string; label: string };
export function OperationsCreateForm({ resource, vehicles = [], customers = [] }: { resource: "consignments" | "sales" | "inspections"; vehicles?: Option[]; customers?: Option[] }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const numeric = (key: string) => text(key) ? Number(text(key)) : null;
    let payload: Record<string, unknown>;
    if (resource === "consignments") payload = {
      vehicleId: text("vehicleId"), sellerCustomerId: text("customerId"), agreementDate: text("date"),
      askingPrice: numeric("price"), commissionRate: numeric("commission"), status: text("status"), notes: text("notes") || null,
    };
    else if (resource === "sales") {
      const localDate = text("date");
      payload = {
        vehicleId: text("vehicleId"), buyerCustomerId: text("customerId"),
        saleDate: localDate ? new Date(localDate).toISOString() : null,
        salePrice: numeric("price"), status: text("status"), notes: text("notes") || null,
      };
    } else payload = {
      vehicleId: text("vehicleId"), inspectionDate: text("date"), result: text("result"), notes: text("notes") || null,
    };
    setError(null); setSaved(false); setPending(true);
    try {
      const response = await fetch(`/api/admin/records/${resource}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save this record.");
      element.reset(); setSaved(true); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save this record."); }
    finally { setPending(false); }
  }

  return <form className="admin-operation-form" onSubmit={submit}><div className="admin-form-grid">
    <label>Vehicle<select name="vehicleId" required defaultValue=""><option value="" disabled>Select a vehicle</option>{vehicles.map((vehicle) => <option value={vehicle.id} key={vehicle.id}>{vehicle.label}</option>)}</select></label>
    {resource !== "inspections" && <label>{resource === "sales" ? "Buyer" : "Seller"}<select name="customerId" required defaultValue=""><option value="" disabled>Select a customer</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.label}</option>)}</select></label>}
    {resource === "consignments" ? <><label>Agreement date<input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label><label>Asking price (USD)<input name="price" type="number" required min="1" step="0.01" /></label><label>Commission (%)<input name="commission" type="number" required min="0" max="100" step="0.01" /></label><label>Agreement status<select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="active">Active</option></select></label></>
      : resource === "sales" ? <><label>Sale date<input name="date" type="datetime-local" /></label><label>Sale price (USD)<input name="price" type="number" required min="1" step="0.01" /></label><label>Sale status<select name="status" defaultValue="pending"><option value="pending">Pending</option><option value="completed">Completed</option></select></label></>
      : <><label>Inspection date<input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label><label>Result<select name="result" defaultValue="pending"><option value="pending">Pending</option><option value="passed">Passed</option><option value="passed_with_notes">Passed with notes</option><option value="failed">Failed</option></select></label></>}
    <label className="admin-form-wide">Notes<textarea name="notes" rows={3} maxLength={4000} /></label>
  </div>{error && <p className="form-error" role="alert">{error}</p>}{saved && <p className="operation-success" role="status">Record saved.</p>}<button className="button button-dark" disabled={pending}>{pending ? "Saving…" : `Record ${resource === "inspections" ? "inspection" : resource === "sales" ? "sale" : "consignment"}`}<ArrowUpRight size={14} /></button></form>;
}
