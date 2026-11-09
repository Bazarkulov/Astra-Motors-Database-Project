import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeStaffApi } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const vehicleInput = z.object({
  make: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(100),
  modelYear: z.number().int().min(1886).max(2100),
  trim: z.string().trim().max(100).nullable().optional(),
  askingPrice: z.number().nonnegative().nullable(),
  mileage: z.number().int().nonnegative().nullable(),
  category: z.string().trim().max(50).nullable().optional(),
  bodyStyle: z.string().trim().max(50).nullable().optional(),
  transmission: z.string().trim().max(50).nullable().optional(),
  fuelType: z.string().trim().max(50).nullable().optional(),
  engine: z.string().trim().max(120).nullable().optional(),
  exteriorColor: z.string().trim().max(60).nullable().optional(),
  interiorColor: z.string().trim().max(60).nullable().optional(),
  description: z.string().trim().max(10000).nullable().optional(),
  status: z.enum(["draft", "available", "reserved", "sold", "unavailable"]).default("draft"),
  published: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
});

function normalized(value: string) { return value.toLowerCase().replace(/\s+/g, " ").trim(); }

export async function POST(request: NextRequest) {
  const staff = await authorizeStaffApi();
  if (!staff) return NextResponse.json({ error: "Administration access required." }, { status: 403 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Invalid vehicle details." }, { status: 400 }); }
  const parsed = vehicleInput.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Check the vehicle details and try again." }, { status: 400 });

  try {
    const supabase = createAdminClient();
    const input = parsed.data;
    const makeName = input.make.replace(/\s+/g, " ").trim();
    const modelName = input.model.replace(/\s+/g, " ").trim();
    const { data: make, error: makeError } = await supabase.from("make").upsert({ name: makeName, normalized_name: normalized(makeName) }, { onConflict: "normalized_name" }).select("id").single();
    if (makeError || !make) throw new Error("Unable to save make.");
    const { data: model, error: modelError } = await supabase.from("model").upsert({ make_id: make.id, name: modelName, normalized_name: normalized(modelName), category: input.category ?? null }, { onConflict: "make_id,normalized_name" }).select("id").single();
    if (modelError || !model) throw new Error("Unable to save model.");
    const { data: vehicle, error } = await supabase.from("vehicle").insert({
      make_id: make.id,
      model_id: model.id,
      model_year: input.modelYear,
      trim: input.trim || null,
      asking_price: input.askingPrice,
      mileage: input.mileage,
      mileage_unit: "mi",
      category: input.category || null,
      body_style: input.bodyStyle || null,
      transmission: input.transmission || null,
      fuel_type: input.fuelType || null,
      engine: input.engine || null,
      exterior_color: input.exteriorColor || null,
      interior_color: input.interiorColor || null,
      description: input.description || null,
      is_featured: input.isFeatured,
      status: input.status,
      published_at: input.published && ["available", "reserved", "sold"].includes(input.status) ? new Date().toISOString() : null,
    }).select("id").single();
    if (error || !vehicle) throw new Error("Unable to save vehicle.");
    return NextResponse.json({ id: vehicle.id }, { status: 201 });
  } catch (error) {
    console.error("Vehicle creation failed", error);
    return NextResponse.json({ error: "Could not save this vehicle. Check the database connection and try again." }, { status: 503 });
  }
}
