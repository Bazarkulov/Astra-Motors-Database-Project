import { createClient } from "@/lib/supabase/server";

export type PublicVehicle = {
  id: string;
  make_name: string;
  model_name: string;
  model_year: number;
  trim: string | null;
  vin: string | null;
  mileage: number | null;
  mileage_unit: string | null;
  asking_price: number | null;
  currency: string;
  status: string;
  category: string | null;
  body_style: string | null;
  transmission: string | null;
  fuel_type: string | null;
  engine: string | null;
  horsepower: number | null;
  exterior_color: string | null;
  interior_color: string | null;
  description: string | null;
  is_featured: boolean;
  published_at: string | null;
  search_text: string;
};

export type InventoryFilters = {
  q?: string;
  make?: string;
  yearFrom?: number;
  yearTo?: number;
  priceFrom?: number;
  priceTo?: number;
  mileageTo?: number;
  category?: string;
  transmission?: string;
  fuel?: string;
  status?: string;
  sort?: string;
  page?: number;
  featured?: boolean;
};

const PAGE_SIZE = 12;

function positiveNumber(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function readInventoryFilters(params: Record<string, string | string[] | undefined>): InventoryFilters {
  const one = (key: string) => typeof params[key] === "string" ? params[key] as string : undefined;
  const integer = (key: string) => {
    const value = positiveNumber(one(key));
    return value !== undefined && Number.isInteger(value) ? value : undefined;
  };
  const status = one("status");
  const transmission = one("transmission");
  const fuel = one("fuel");
  const sort = one("sort");
  return {
    q: one("q")?.trim().slice(0, 100),
    make: one("make")?.slice(0, 80),
    yearFrom: integer("yearFrom"),
    yearTo: integer("yearTo"),
    priceFrom: positiveNumber(one("priceFrom")),
    priceTo: positiveNumber(one("priceTo")),
    mileageTo: positiveNumber(one("mileageTo")),
    category: ["Classic", "Vintage", "Muscle", "Sports", "Performance", "Restomod", "Collector"].includes(one("category") ?? "") ? one("category") : undefined,
    transmission: ["Manual", "Automatic"].includes(transmission ?? "") ? transmission : undefined,
    fuel: ["Gasoline", "Diesel", "Electric"].includes(fuel ?? "") ? fuel : undefined,
    status: ["available", "reserved", "sold"].includes(status ?? "") ? status : undefined,
    sort: ["recent", "price_asc", "price_desc", "year_asc", "year_desc"].includes(sort ?? "") ? sort : undefined,
    page: Math.max(1, Math.floor(positiveNumber(one("page")) ?? 1)),
  };
}

export async function getInventory(filters: InventoryFilters = {}) {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("public_vehicle")
      .select("*", { count: "exact" });

    if (filters.q) {
      const sanitized = filters.q
        .replace(/[^\p{L}\p{N}\s-]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (sanitized) query = query.textSearch("search_text", sanitized, { type: "websearch", config: "simple" });
    }
    if (filters.make) query = query.eq("make_name", filters.make);
    if (filters.yearFrom !== undefined) query = query.gte("model_year", filters.yearFrom);
    if (filters.yearTo !== undefined) query = query.lte("model_year", filters.yearTo);
    if (filters.priceFrom !== undefined) query = query.gte("asking_price", filters.priceFrom);
    if (filters.priceTo !== undefined) query = query.lte("asking_price", filters.priceTo);
    if (filters.mileageTo !== undefined) query = query.lte("mileage", filters.mileageTo);
    if (filters.category) query = query.ilike("category", filters.category);
    if (filters.transmission) query = query.ilike("transmission", filters.transmission);
    if (filters.fuel) query = query.ilike("fuel_type", filters.fuel);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.featured) query = query.eq("is_featured", true);

    switch (filters.sort) {
      case "price_asc": query = query.order("asking_price", { ascending: true, nullsFirst: false }); break;
      case "price_desc": query = query.order("asking_price", { ascending: false, nullsFirst: false }); break;
      case "year_asc": query = query.order("model_year", { ascending: true }); break;
      case "year_desc": query = query.order("model_year", { ascending: false }); break;
      default: query = query.order("published_at", { ascending: false, nullsFirst: false });
    }

    const from = ((filters.page ?? 1) - 1) * PAGE_SIZE;
    const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) return { data: [] as PublicVehicle[], count: 0, error: error.message };
    return { data: (data ?? []) as PublicVehicle[], count: count ?? 0, error: null };
  } catch (error) {
    return { data: [] as PublicVehicle[], count: 0, error: error instanceof Error ? error.message : "Inventory is unavailable." };
  }
}

export async function getVehicle(id: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("public_vehicle").select("*").eq("id", id).maybeSingle();
    if (error) return { data: null, photos: [], inspections: [], error: error.message };
    if (!data) return { data: null, photos: [], inspections: [], error: null };
    const [photoResult, inspectionResult] = await Promise.all([
      supabase.from("vehicle_photo").select("id,storage_path,alt_text,caption,sort_order,is_primary").eq("vehicle_id", id).order("sort_order"),
      supabase.from("public_inspection_summary").select("inspection_date,result").eq("vehicle_id", id).order("inspection_date", { ascending: false }),
    ]);
    return {
      data: data as PublicVehicle,
      photos: photoResult.data ?? [],
      inspections: inspectionResult.data ?? [],
      error: photoResult.error?.message ?? inspectionResult.error?.message ?? null,
    };
  } catch (error) {
    return { data: null, photos: [], inspections: [], error: error instanceof Error ? error.message : "Vehicle details are unavailable." };
  }
}

export async function getFeaturedVehicles(limit = 3) {
  const result = await getInventory({ sort: "recent", page: 1, featured: true });
  return { ...result, data: result.data.slice(0, limit) };
}

export async function getPublicMakes() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("make").select("name").order("name");
    if (error) return [] as string[];
    return (data ?? []).map((row) => row.name);
  } catch {
    return [] as string[];
  }
}

export function formatPrice(price: number | null, currency = "USD") {
  if (price === null || !Number.isFinite(Number(price))) return "Price on request";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(price));
}

export function formatMileage(mileage: number | null, unit: string | null = "mi") {
  if (mileage === null) return "Mileage not available";
  return `${new Intl.NumberFormat("en-US").format(mileage)} ${unit ?? "mi"}`;
}
