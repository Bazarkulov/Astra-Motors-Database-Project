import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Search } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { getInventory, getPublicMakes, readInventoryFilters } from "@/lib/database/vehicles";

type InventoryPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function InventoryPage({ searchParams }: InventoryPageProps) {
  return <><SiteHeader /><Suspense fallback={<InventoryFallback />}><InventoryResults searchParams={searchParams} /></Suspense><SiteFooter /></>;
}

async function InventoryResults({ searchParams }: InventoryPageProps) {
  const raw = await searchParams;
  const filters = readInventoryFilters(raw);
  const inventory = await getInventory(filters);
  const makes = await getPublicMakes();
  const pages = Math.max(1, Math.ceil(inventory.count / 12));
  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(raw)) if (typeof value === "string" && key !== "page") params.set(key, value);
    params.set("page", String(page));
    return `/inventory?${params.toString()}`;
  };

  return <main className="page-main">
    <section className="page-hero"><div className="page-hero-inner"><span className="eyebrow light">THE MOTORING COLLECTION — {inventory.count.toString().padStart(2, "0")} LISTINGS</span><h1>Find your<br /><em>kind of drive.</em></h1><p>Distinctive automobiles, thoughtfully selected. Explore the collection and begin your next story.</p></div></section>
    <section className="inventory-content"><div className="inventory-topline"><span className="eyebrow">CURRENT COLLECTION</span><Link className="text-link" href="/contact">Looking for something else? <ArrowUpRight size={14} /></Link></div>
      <form className="filter-panel" action="/inventory" method="get">
        <label className="filter-search"><span className="eyebrow">SEARCH THE COLLECTION</span><div><Search size={17} /><input name="q" placeholder="Make, model or year" defaultValue={filters.q} /></div></label>
        <label><span className="eyebrow">MAKE</span><select name="make" defaultValue={filters.make ?? ""}><option value="">All makes</option>{makes.map((make) => <option key={make}>{make}</option>)}</select></label>
        <label><span className="eyebrow">YEAR FROM</span><input name="yearFrom" inputMode="numeric" placeholder="Any" defaultValue={filters.yearFrom ?? ""} /></label>
        <label><span className="eyebrow">YEAR TO</span><input name="yearTo" inputMode="numeric" placeholder="Any" defaultValue={filters.yearTo ?? ""} /></label>
        <label><span className="eyebrow">PRICE FROM</span><input name="priceFrom" inputMode="numeric" placeholder="Any" defaultValue={filters.priceFrom ?? ""} /></label>
        <label><span className="eyebrow">MAX PRICE</span><input name="priceTo" inputMode="numeric" placeholder="Any" defaultValue={filters.priceTo ?? ""} /></label>
        <label><span className="eyebrow">MAX MILEAGE</span><input name="mileageTo" inputMode="numeric" placeholder="Any" defaultValue={filters.mileageTo ?? ""} /></label>
        <label><span className="eyebrow">CATEGORY</span><select name="category" defaultValue={filters.category ?? ""}><option value="">Any</option>{["Classic", "Vintage", "Muscle", "Sports", "Performance", "Restomod", "Collector"].map((category) => <option key={category}>{category}</option>)}</select></label>
        <label><span className="eyebrow">TRANSMISSION</span><select name="transmission" defaultValue={filters.transmission ?? ""}><option value="">Any</option><option>Manual</option><option>Automatic</option></select></label>
        <label><span className="eyebrow">FUEL</span><select name="fuel" defaultValue={filters.fuel ?? ""}><option value="">Any</option><option>Gasoline</option><option>Diesel</option><option>Electric</option></select></label>
        <label><span className="eyebrow">AVAILABILITY</span><select name="status" defaultValue={filters.status ?? ""}><option value="">Any</option><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option></select></label>
        <div className="filter-actions"><label><span className="eyebrow">SORT BY</span><select name="sort" defaultValue={filters.sort ?? "recent"}><option value="recent">Recently added</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="year_desc">Year: newest first</option><option value="year_asc">Year: oldest first</option></select></label><button className="button button-dark" type="submit">Apply filters <ArrowUpRight size={15} /></button></div>
      </form>
      <div className="results-line"><span>{inventory.count} {inventory.count === 1 ? "vehicle" : "vehicles"} found</span>{filters.q && <span>Matching “{filters.q}”</span>}</div>
      {inventory.error ? <div className="notice-box"><span className="eyebrow">WE COULDN’T LOAD THE COLLECTION</span><p>Inventory is temporarily unavailable. Please try again shortly.</p></div> : inventory.data.length ? <div className="vehicle-grid">{inventory.data.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}</div> : <div className="notice-box"><span className="eyebrow">NO MATCHES JUST YET</span><p>Try adjusting your filters, or tell us what you have in mind.</p><Link className="text-link" href="/contact">Ask us to help <ArrowUpRight size={15} /></Link></div>}
      {pages > 1 && <nav className="pagination" aria-label="Inventory pages"><Link aria-disabled={filters.page === 1} href={pageHref(Math.max(1, (filters.page ?? 1) - 1))}><ArrowLeft size={15} /> Previous</Link><span>Page {filters.page ?? 1} of {pages}</span><Link aria-disabled={(filters.page ?? 1) >= pages} href={pageHref(Math.min(pages, (filters.page ?? 1) + 1))}>Next <ArrowRight size={15} /></Link></nav>}
    </section>
  </main>;
}

function InventoryFallback() {
  return <main className="page-main"><section className="page-hero"><div className="page-hero-inner"><span className="eyebrow light">THE MOTORING COLLECTION</span><h1>Find your<br /><em>kind of drive.</em></h1><p>Loading the current collection…</p></div></section><section className="inventory-content"><div className="notice-box"><span className="eyebrow">CURRENT COLLECTION</span><p>Loading inventory and search filters…</p></div></section></main>;
}
