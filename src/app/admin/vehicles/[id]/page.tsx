import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminShell } from "@/components/dashboard/admin-shell";
import { AdminVehicleForm } from "@/components/forms/admin-vehicle-form";
import { VehiclePhotoUploader } from "@/components/forms/vehicle-photo-uploader";
import { DemoRecordBadge } from "@/components/dashboard/demo-record-badge";
import { requireStaff } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminVehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const { data: vehicle, error } = await supabase.from("vehicle").select("*,make:make_id(name),model:model_id(name)").eq("id", id).maybeSingle();
  return <AdminShell staffName={`${staff.firstName} ${staff.lastName}`} role={staff.role}><main className="admin-content"><Link href="/admin/vehicles" className="admin-back"><ArrowLeft size={14} /> Inventory</Link><div className="admin-page-title"><div><span className="eyebrow">LISTING DETAILS</span><h1>{vehicle ? `${vehicle.model_year} ${vehicle.make?.name ?? ""} ${vehicle.model?.name ?? ""}` : "Vehicle record."}</h1>{vehicle?.is_demo && <DemoRecordBadge />}</div></div>{error || !vehicle ? <div className="admin-alert">Vehicle details are unavailable.</div> : <><section className="admin-form-card"><p>Keep the listing accurate and confirm details before publishing.</p><AdminVehicleForm vehicleId={id} initial={{ make: vehicle.make?.name, model: vehicle.model?.name, modelYear: vehicle.model_year, trim: vehicle.trim, askingPrice: vehicle.asking_price, mileage: vehicle.mileage, category: vehicle.category, bodyStyle: vehicle.body_style, transmission: vehicle.transmission, fuelType: vehicle.fuel_type, engine: vehicle.engine, exteriorColor: vehicle.exterior_color, interiorColor: vehicle.interior_color, description: vehicle.description, status: vehicle.status, published: Boolean(vehicle.published_at), isFeatured: vehicle.is_featured, isDemo: vehicle.is_demo }} /></section><section className="admin-form-card photo-admin-card"><span className="eyebrow">VEHICLE PHOTOGRAPHY</span><h2>Images for this listing</h2><VehiclePhotoUploader vehicleId={id} /></section></>}</main></AdminShell>;
}
