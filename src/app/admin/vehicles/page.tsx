import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, CarFront } from "lucide-react";
import { AdminShell } from "@/components/dashboard/admin-shell";
import { VehicleRowActions } from "@/components/dashboard/vehicle-row-actions";
import { DemoRecordBadge } from "@/components/dashboard/demo-record-badge";
import { requireStaff } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminVehiclesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const staff = await requireStaff();
  const params = await searchParams;
  const status = typeof params.status === "string" && ["draft", "available", "reserved", "sold", "unavailable"].includes(params.status) ? params.status : undefined;
  const page = Math.max(1, Math.floor(Number(params.page) || 1));
  let vehicles: any[] = [];
  let total = 0;
  let error: string | null = null;
  try {
    const supabase = await createClient();
    let query = supabase.from("vehicle").select("id,model_year,trim,status,is_demo,asking_price,currency,mileage,mileage_unit,published_at,updated_at,make:make_id(name),model:model_id(name)", { count: "exact" }).order("updated_at", { ascending: false }).range((page - 1) * 50, page * 50 - 1);
    if (status) query = query.eq("status", status);
    const result = await query;
    vehicles = result.data ?? [];
    total = result.count ?? 0;
    if (result.error) error = "Inventory could not be loaded. Confirm staff permissions and migration status.";
  } catch { error = "Connect Supabase to manage inventory."; }
  return <AdminShell staffName={`${staff.firstName} ${staff.lastName}`} role={staff.role}><main className="admin-content"><div className="admin-page-title"><div><span className="eyebrow">VEHICLE MANAGEMENT</span><h1>The inventory.</h1></div><Link className="admin-action" href="/admin/vehicles/new">Add a vehicle <ArrowUpRight size={15} /></Link></div>
    <nav className="admin-filter-tabs"><Link href="/admin/vehicles" className={!status ? "active" : ""}>All</Link>{["available", "draft", "reserved", "sold", "unavailable"].map((item) => <Link key={item} href={`/admin/vehicles?status=${item}`} className={status === item ? "active" : ""}>{item}</Link>)}</nav>
    {error && <div className="admin-alert">{error}</div>}
    {vehicles.length ? <div className="admin-recent-card admin-inventory-card"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Vehicle</th><th>Price</th><th>Mileage</th><th>Listing</th><th>Actions</th></tr></thead><tbody>{vehicles.map((vehicle) => <tr key={vehicle.id}><td><Link className="admin-vehicle-name" href={`/admin/vehicles/${vehicle.id}`}><strong>{vehicle.model_year} {vehicle.make?.name} {vehicle.model?.name}</strong><small>{vehicle.trim ?? "Trim not listed"}</small></Link>{vehicle.is_demo && <DemoRecordBadge />}</td><td>{vehicle.asking_price ? new Intl.NumberFormat("en-US", { style: "currency", currency: vehicle.currency, maximumFractionDigits: 0 }).format(Number(vehicle.asking_price)) : "Not set"}</td><td>{vehicle.mileage === null ? "Not set" : `${Number(vehicle.mileage).toLocaleString()} ${vehicle.mileage_unit}`}</td><td><span className={`admin-status status-${vehicle.status}`}>{vehicle.status}</span><small className="publish-state">{vehicle.is_demo ? "Hidden demo record" : vehicle.published_at ? "Public" : "Private"}</small></td><td><VehicleRowActions id={vehicle.id} status={vehicle.status} published={Boolean(vehicle.published_at)} isDemo={vehicle.is_demo} /></td></tr>)}</tbody></table></div></div> : !error ? <div className="admin-empty-state"><CarFront size={23} /><h2>No vehicles in this view.</h2><p>Create a listing or change the status filter.</p><Link href="/admin/vehicles/new" className="text-link">Add a vehicle <ArrowUpRight size={13} /></Link></div> : null}
    {total > 50 && <nav className="admin-pagination" aria-label="Inventory pages"><Link aria-disabled={page === 1} href={`/admin/vehicles${status ? `?status=${status}&` : "?"}page=${Math.max(1, page - 1)}`}><ArrowLeft size={13} /> Previous</Link><span>Page {page} of {Math.ceil(total / 50)}</span><Link aria-disabled={page >= Math.ceil(total / 50)} href={`/admin/vehicles${status ? `?status=${status}&` : "?"}page=${Math.min(Math.ceil(total / 50), page + 1)}`}>Next <ArrowRight size={13} /></Link></nav>}
    <p className="admin-footnote">Showing {vehicles.length} of {total} records. Results are paginated at the database.</p>
  </main></AdminShell>;
}
