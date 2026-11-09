import Link from "next/link";
import { ArrowUpRight, Gauge } from "lucide-react";
import { formatMileage, formatPrice, type PublicVehicle } from "@/lib/database/vehicles";

export function VehicleCard({ vehicle }: { vehicle: PublicVehicle }) {
  return (
    <article className="vehicle-card">
      <Link href={`/vehicles/${vehicle.id}`} className="vehicle-image-placeholder" aria-label={`View ${vehicle.model_year} ${vehicle.make_name} ${vehicle.model_name}`}>
        <span className="image-placeholder-label">PHOTOGRAPH PENDING</span>
        <span className="image-year">{vehicle.model_year}</span>
      </Link>
      <div className="vehicle-card-body">
        <div className="vehicle-card-heading"><div><span className="vehicle-make">{vehicle.make_name}</span><h3>{vehicle.model_name}{vehicle.trim ? ` ${vehicle.trim}` : ""}</h3></div><span className="status-dot" aria-label={vehicle.status} title={vehicle.status} /></div>
        <div className="vehicle-card-meta"><span><Gauge size={14} />{formatMileage(vehicle.mileage, vehicle.mileage_unit)}</span><span>{vehicle.transmission ?? "Transmission not listed"}</span></div>
        <div className="vehicle-card-bottom"><strong>{formatPrice(vehicle.asking_price, vehicle.currency)}</strong><Link href={`/vehicles/${vehicle.id}`} aria-label="View vehicle details"><ArrowUpRight size={18} /></Link></div>
      </div>
    </article>
  );
}
