import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminShell } from "@/components/dashboard/admin-shell";
import { AdminVehicleForm } from "@/components/forms/admin-vehicle-form";
import { requireStaff } from "@/lib/supabase/auth";

export default async function NewVehiclePage() {
  const staff = await requireStaff();
  return <AdminShell staffName={`${staff.firstName} ${staff.lastName}`} role={staff.role}><main className="admin-content"><Link href="/admin/vehicles" className="admin-back"><ArrowLeft size={14} /> Inventory</Link><div className="admin-page-title"><div><span className="eyebrow">NEW LISTING</span><h1>Add a vehicle.</h1></div></div><section className="admin-form-card"><p>Enter verified details. New listings stay private until published.</p><AdminVehicleForm /></section></main></AdminShell>;
}
