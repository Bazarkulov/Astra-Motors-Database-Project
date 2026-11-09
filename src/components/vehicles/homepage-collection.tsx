import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { getFeaturedVehicles, getInventory } from "@/lib/database/vehicles";

export async function HomepageCollection() {
  const [featured, recentlyAdded] = await Promise.all([
    getFeaturedVehicles(3),
    getInventory({ sort: "recent", page: 1 }),
  ]);
  const brands = Array.from(new Set(featured.data.map((vehicle) => vehicle.make_name))).slice(0, 5);

  return <>
    <section id="collection" className="content-section collection-section">
      <div className="section-heading"><div><span className="eyebrow">THE COLLECTION</span><h2>Considered.<br /><em>Never ordinary.</em></h2></div><Link className="text-link" href="/inventory">View all inventory <ArrowUpRight size={16} /></Link></div>
      {featured.error ? <div className="notice-box"><span className="eyebrow">INVENTORY CONNECTION</span><p>Live inventory will appear here once the dealership database is connected.</p></div> : featured.data.length ? <div className="vehicle-grid">{featured.data.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}</div> : <div className="notice-box"><span className="eyebrow">A COLLECTION IN THE MAKING</span><p>We are thoughtfully building our first collection. Check back soon, or tell us what you are looking for.</p><Link className="text-link" href="/contact">Start a conversation <ArrowUpRight size={15} /></Link></div>}
      <div className="collection-foot"><span>01 — CURATED MOTORING</span><span>EVERY STORY STARTS SOMEWHERE</span></div>
    </section>

    <section className="recent-section"><div className="recent-heading"><div><span className="eyebrow">FRESH TO THE COLLECTION</span><h2>Recently<br /><em>arrived.</em></h2></div><Link className="text-link" href="/inventory?sort=recent">See the latest <ArrowUpRight size={15} /></Link></div>
      {recentlyAdded.error ? <p className="quiet-copy">Recently added inventory will appear when the database is connected.</p> : recentlyAdded.data.length ? <div className="recent-list">{recentlyAdded.data.slice(0, 3).map((vehicle, index) => <Link className="recent-row" href={`/vehicles/${vehicle.id}`} key={vehicle.id}><span className="recent-index">0{index + 1}</span><span className="recent-name"><small>{vehicle.make_name} · {vehicle.model_year}</small><strong>{vehicle.model_name}{vehicle.trim ? ` ${vehicle.trim}` : ""}</strong></span><span className="recent-price">{vehicle.asking_price ? new Intl.NumberFormat("en-US", { style: "currency", currency: vehicle.currency, maximumFractionDigits: 0 }).format(vehicle.asking_price) : "Price on request"}</span><ArrowUpRight size={16} /></Link>)}</div> : <div className="recent-empty">Our first arrivals are being prepared. <Link href="/contact">Tell us what you hope to find <ArrowUpRight size={13} /></Link></div>}
    </section>

    <section className="brand-section"><span className="eyebrow">THE MAKERS BEHIND THE MOMENT</span><h2>Marques with<br /><em>a lasting mark.</em></h2>{brands.length ? <div className="brand-list">{brands.map((brand) => <span key={brand}>{brand}</span>)}</div> : <p className="quiet-copy">Featured marques will be shown here as the collection grows.</p>}</section>
  </>;
}

export function HomepageCollectionFallback() {
  return <>
    <section id="collection" className="content-section collection-section"><div className="section-heading"><div><span className="eyebrow">THE COLLECTION</span><h2>Considered.<br /><em>Never ordinary.</em></h2></div><Link className="text-link" href="/inventory">View all inventory <ArrowUpRight size={16} /></Link></div><div className="notice-box"><span className="eyebrow">THE COLLECTION</span><p>Loading current inventory…</p></div></section>
    <section className="recent-section"><div className="recent-heading"><span className="eyebrow">FRESH TO THE COLLECTION</span><h2>Recently<br /><em>arrived.</em></h2></div><p className="quiet-copy">Loading recent arrivals…</p></section>
    <section className="brand-section"><span className="eyebrow">THE MAKERS BEHIND THE MOMENT</span><h2>Marques with<br /><em>a lasting mark.</em></h2><p className="quiet-copy">Loading featured marques…</p></section>
  </>;
}
