"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

export type VehicleFormValues = {
  make?: string | null; model?: string | null; modelYear?: number | null; trim?: string | null;
  askingPrice?: number | string | null; mileage?: number | null; category?: string | null;
  bodyStyle?: string | null; transmission?: string | null; fuelType?: string | null; engine?: string | null;
  exteriorColor?: string | null; interiorColor?: string | null; description?: string | null;
  status?: string; published?: boolean; isFeatured?: boolean; isDemo?: boolean;
};

const fields = [
  ["Trim", "trim", "e.g. SS 396"], ["Category", "category", "Classic, Muscle, Sports…"],
  ["Body style", "bodyStyle", "Coupe, convertible…"], ["Transmission", "transmission", "Manual or automatic"],
  ["Fuel type", "fuelType", "Gasoline, diesel…"], ["Engine", "engine", "Engine as provided"],
  ["Exterior color", "exteriorColor", "Color"], ["Interior color", "interiorColor", "Color"],
] as const;

export function AdminVehicleForm({ vehicleId, initial = {} }: { vehicleId?: string; initial?: VehicleFormValues }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const numberOrNull = (key: string) => String(form.get(key) ?? "").trim() ? Number(form.get(key)) : null;
    const payload = {
      make: String(form.get("make") ?? "").trim(), model: String(form.get("model") ?? "").trim(),
      modelYear: numberOrNull("modelYear"), trim: String(form.get("trim") ?? "").trim() || null,
      askingPrice: numberOrNull("askingPrice"), mileage: numberOrNull("mileage"),
      category: String(form.get("category") ?? "").trim() || null,
      bodyStyle: String(form.get("bodyStyle") ?? "").trim() || null,
      transmission: String(form.get("transmission") ?? "").trim() || null,
      fuelType: String(form.get("fuelType") ?? "").trim() || null,
      engine: String(form.get("engine") ?? "").trim() || null,
      exteriorColor: String(form.get("exteriorColor") ?? "").trim() || null,
      interiorColor: String(form.get("interiorColor") ?? "").trim() || null,
      description: String(form.get("description") ?? "").trim() || null,
      status: String(form.get("status") ?? "draft"), published: form.get("published") === "on", isFeatured: form.get("isFeatured") === "on",
    };
    setPending(true); setError(null);
    try {
      const response = await fetch(vehicleId ? `/api/admin/vehicles/${vehicleId}` : "/api/admin/vehicles", {
        method: vehicleId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save vehicle.");
      router.push(vehicleId ? `/admin/vehicles/${vehicleId}` : `/admin/vehicles/${result.id}`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save vehicle.");
    } finally { setPending(false); }
  }

  return <form className="admin-form" onSubmit={submit}><div className="admin-form-grid">
    <label>Make<input name="make" required maxLength={80} defaultValue={initial.make ?? ""} placeholder="Chevrolet" /></label>
    <label>Model<input name="model" required maxLength={100} defaultValue={initial.model ?? ""} placeholder="Camaro" /></label>
    <label>Year<input name="modelYear" type="number" min="1886" max="2100" required defaultValue={initial.modelYear ?? ""} /></label>
    <label>Trim<input name="trim" maxLength={100} defaultValue={initial.trim ?? ""} placeholder="Optional" /></label>
    <label>Asking price (USD)<input name="askingPrice" type="number" min="0" step="0.01" defaultValue={initial.askingPrice ?? ""} placeholder="Optional" /></label>
    <label>Mileage (mi)<input name="mileage" type="number" min="0" step="1" defaultValue={initial.mileage ?? ""} placeholder="Optional" /></label>
    {fields.slice(1).map(([label, name, placeholder]) => <label key={name}>{label}<input name={name} maxLength={120} defaultValue={(initial[name] as string | null) ?? ""} placeholder={placeholder} /></label>)}
    <label>Status<select name="status" defaultValue={initial.status ?? "draft"}><option value="draft">Draft</option><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option><option value="unavailable">Unavailable</option></select></label>
    <label className="admin-form-wide">Description<textarea name="description" maxLength={10000} rows={6} defaultValue={initial.description ?? ""} placeholder="Add verified vehicle details only." /></label>
    {!initial.isDemo && <label className="admin-checkbox admin-form-wide"><input type="checkbox" name="published" defaultChecked={initial.published ?? false} /><span>Publish this listing after saving</span></label>}
    <label className="admin-checkbox admin-form-wide"><input type="checkbox" name="isFeatured" defaultChecked={initial.isFeatured ?? false} /><span>Feature this vehicle on the homepage</span></label>
  </div>{initial.isDemo && <p className="admin-demo-notice">This is a fictional demo vehicle. It is excluded from the public catalog and cannot be published.</p>}{error && <p className="form-error" role="alert">{error}</p>}<div className="admin-form-actions"><button type="button" className="button button-outline" onClick={() => router.back()}>Cancel</button><button className="button button-dark" type="submit" disabled={pending}>{pending ? "Saving…" : vehicleId ? "Save changes" : "Create vehicle"}<ArrowUpRight size={15} /></button></div></form>;
}
