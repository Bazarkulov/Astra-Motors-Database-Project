import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SaveVehicleButton } from "@/components/vehicles/save-vehicle-button";
import { ShareVehicleButton } from "@/components/vehicles/share-vehicle-button";
import { formatMileage, formatPrice, getVehicle } from "@/lib/database/vehicles";
import { createClient } from "@/lib/supabase/server";

export default async function VehicleDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getVehicle(id);
  if (!result.data && !result.error) notFound();
  if (!result.data) return <><SiteHeader /><main className="page-main"><section className="error-panel"><span className="eyebrow">DETAILS TEMPORARILY UNAVAILABLE</span><h1>We can’t load<br /><em>this listing.</em></h1><p>Please try again later or contact our team for help.</p><Link className="button button-dark" href="/contact">Contact the team <ArrowUpRight size={15} /></Link></section></main><SiteFooter /></>;

  const vehicle = result.data;
  const supabase = await createClient().catch(() => null);
  const photos = supabase ? result.photos.map((photo) => ({ ...photo, src: supabase.storage.from("vehicle-photos").getPublicUrl(photo.storage_path).data.publicUrl })) : [];
  const title = `${vehicle.model_year} ${vehicle.make_name} ${vehicle.model_name}${vehicle.trim ? ` ${vehicle.trim}` : ""}`;
  const contactHref = `/contact?vehicle=${vehicle.id}`;
  const details: [string, string | number | null][] = [
    ["Year", vehicle.model_year], ["Make", vehicle.make_name], ["Model", vehicle.model_name], ["Trim", vehicle.trim],
    ["VIN", vehicle.vin], ["Mileage", vehicle.mileage === null ? null : formatMileage(vehicle.mileage, vehicle.mileage_unit)],
    ["Transmission", vehicle.transmission], ["Fuel", vehicle.fuel_type], ["Engine", vehicle.engine],
    ["Horsepower", vehicle.horsepower], ["Exterior", vehicle.exterior_color], ["Interior", vehicle.interior_color],
  ];

  return <><SiteHeader /><main className="page-main vehicle-detail-page">
    <div className="breadcrumb"><Link href="/inventory"><ArrowLeft size={14} /> Back to inventory</Link><span><ChevronRight size={14} /> {vehicle.make_name}</span></div>
    <section className="detail-top"><div><span className="eyebrow">MOTORS & HERITAGE — THE COLLECTION</span><h1>{vehicle.model_year} {vehicle.make_name}<br /><em>{vehicle.model_name}{vehicle.trim ? ` ${vehicle.trim}` : ""}</em></h1></div><div className="detail-price"><span className="eyebrow">ASKING PRICE</span><strong>{formatPrice(vehicle.asking_price, vehicle.currency)}</strong><span className="availability"><i /> {vehicle.status.replaceAll("_", " ")}</span></div></section>
    <section className="detail-gallery">
      {photos.length ? <div className="photo-grid">{photos.map((photo) => <div className="vehicle-photo" key={photo.id}><Image src={photo.src} alt={photo.alt_text ?? title} fill sizes="(max-width: 800px) 100vw, 70vw" unoptimized /></div>)}</div> : <div className="detail-photo-placeholder"><span className="placeholder-ring"/><span className="eyebrow">PHOTOGRAPH NOT AVAILABLE</span><p>We only display images supplied and approved for this vehicle.</p></div>}
      <div className="detail-actions"><Link href={contactHref} className="button button-dark">Enquire about this vehicle <ArrowUpRight size={15} /></Link><Link href={`${contactHref}&type=test-drive`} className="button button-outline">Request a viewing <ArrowUpRight size={15} /></Link><SaveVehicleButton vehicleId={vehicle.id} /><ShareVehicleButton /></div>
    </section>
    <div className="detail-columns"><section className="detail-description"><span className="eyebrow">THE DETAILS</span><h2>Built to be<br /><em>remembered.</em></h2><p>{vehicle.description || "A full description for this vehicle has not been provided. Please contact our team for verified details."}</p><div className="spec-grid">{details.map(([label, value]) => <div className="spec-item" key={label}><span className="eyebrow">{label}</span><strong>{value ?? "Not available"}</strong></div>)}</div></section>
      <aside className="detail-aside"><div className="aside-card"><span className="eyebrow">A CLOSER LOOK</span><h3>Questions are<br /><em>always welcome.</em></h3><p>Speak with our team about history, inspection records, or arranging a visit.</p><Link href={contactHref} className="text-link">Start a conversation <ArrowUpRight size={15} /></Link></div><div className="aside-card inspection-card"><span className="eyebrow">INSPECTION RECORD</span>{result.inspections.length ? <ul>{result.inspections.map((inspection, index) => <li key={`${inspection.inspection_date}-${index}`}><Check size={15} /><span>{inspection.result.replaceAll("_", " ")}<small>{inspection.inspection_date}</small></span></li>)}</ul> : <p>No inspection summary is available for this vehicle.</p>}</div><p className="detail-note">All vehicle information is presented as supplied. Please contact us to confirm details, availability and documentation.</p></aside>
    </div>
  </main><SiteFooter /></>;
}
