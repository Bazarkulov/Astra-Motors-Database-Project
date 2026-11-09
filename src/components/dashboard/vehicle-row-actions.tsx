"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Trash2 } from "lucide-react";

export function VehicleRowActions({ id, status, published, isDemo = false }: { id: string; status: string; published: boolean; isDemo?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  async function remove() {
    if (!window.confirm("Delete this vehicle? Records with sales or consignment history cannot be deleted.")) return;
    const response = await fetch(`/api/admin/vehicles/${id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Could not delete vehicle."); return; }
    router.refresh();
  }
  async function update(changes: { status?: string; published?: boolean }) {
    setError(null);
    const response = await fetch(`/api/admin/vehicles/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Could not update vehicle."); return; }
    router.refresh();
  }
  return <div className="vehicle-row-actions"><Link href={`/admin/vehicles/${id}`} className="row-edit">Manage <ArrowUpRight size={12} /></Link><select aria-label="Vehicle status" value={status} onChange={(event) => update({ status: event.target.value })}><option value="draft">Draft</option><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option><option value="unavailable">Unavailable</option></select>{!isDemo && <button type="button" onClick={() => update({ published: !published })}>{published ? "Unpublish" : "Publish"}</button>}<button type="button" className="delete-row" onClick={remove} aria-label="Delete vehicle"><Trash2 size={14} /></button>{error && <small className="row-error">{error}</small>}</div>;
}
