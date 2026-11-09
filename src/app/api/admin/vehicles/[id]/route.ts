import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeStaffApi } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const updateSchema = z.object({
  make: z.string().trim().min(1).max(80).optional(),
  model: z.string().trim().min(1).max(100).optional(),
  modelYear: z.number().int().min(1886).max(2100).optional(),
  trim: z.string().trim().max(100).nullable().optional(),
  askingPrice: z.number().nonnegative().nullable().optional(),
  mileage: z.number().int().nonnegative().nullable().optional(),
  category: z.string().trim().max(50).nullable().optional(),
  bodyStyle: z.string().trim().max(50).nullable().optional(),
  transmission: z.string().trim().max(50).nullable().optional(),
  fuelType: z.string().trim().max(50).nullable().optional(),
  engine: z.string().trim().max(120).nullable().optional(),
  exteriorColor: z.string().trim().max(60).nullable().optional(),
  interiorColor: z.string().trim().max(60).nullable().optional(),
  description: z.string().trim().max(10000).nullable().optional(),
  status: z.enum(["draft", "available", "reserved", "sold", "unavailable"]).optional(),
  published: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await authorizeStaffApi();
  if (!staff) return NextResponse.json({ error: "Administration access required." }, { status: 403 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid vehicle." }, { status: 400 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Invalid vehicle update." }, { status: 400 }); }
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) return NextResponse.json({ error: "Check the update and try again." }, { status: 400 });
  try {
    const supabase = createAdminClient();
    const { data: current, error: currentError } = await supabase.from("vehicle").select("status,published_at,make_id,is_demo").eq("id", id).single();
    if (currentError || !current) return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
    if (current.is_demo && parsed.data.published === true) return NextResponse.json({ error: "Demo vehicles cannot be published to the public catalog." }, { status: 409 });
    const status = parsed.data.status ?? current.status;
    const publishedAt = parsed.data.published === true
      ? (["available", "reserved", "sold"].includes(status) ? current.published_at ?? new Date().toISOString() : null)
      : parsed.data.published === false ? null : current.published_at;
    const update: Record<string, unknown> = {
      ...(parsed.data.modelYear !== undefined ? { model_year: parsed.data.modelYear } : {}),
      ...(parsed.data.trim !== undefined ? { trim: parsed.data.trim } : {}),
      ...(parsed.data.askingPrice !== undefined ? { asking_price: parsed.data.askingPrice } : {}),
      ...(parsed.data.mileage !== undefined ? { mileage: parsed.data.mileage } : {}),
      ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
      ...(parsed.data.bodyStyle !== undefined ? { body_style: parsed.data.bodyStyle } : {}),
      ...(parsed.data.transmission !== undefined ? { transmission: parsed.data.transmission } : {}),
      ...(parsed.data.fuelType !== undefined ? { fuel_type: parsed.data.fuelType } : {}),
      ...(parsed.data.engine !== undefined ? { engine: parsed.data.engine } : {}),
      ...(parsed.data.exteriorColor !== undefined ? { exterior_color: parsed.data.exteriorColor } : {}),
      ...(parsed.data.interiorColor !== undefined ? { interior_color: parsed.data.interiorColor } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.isFeatured !== undefined ? { is_featured: parsed.data.isFeatured } : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.published !== undefined || parsed.data.status ? { published_at: parsed.data.published === false || !["available", "reserved", "sold"].includes(status) ? null : publishedAt } : {}),
    };
    if (parsed.data.make || parsed.data.model) {
      const makeName = (parsed.data.make ?? "").replace(/\s+/g, " ").trim();
      const modelName = (parsed.data.model ?? "").replace(/\s+/g, " ").trim();
      if (!makeName || !modelName) return NextResponse.json({ error: "Make and model must be provided together." }, { status: 400 });
      const makeNormalized = makeName.toLowerCase();
      const { data: make, error: makeError } = await supabase.from("make").upsert({ name: makeName, normalized_name: makeNormalized }, { onConflict: "normalized_name" }).select("id").single();
      if (makeError || !make) throw makeError;
      const { data: model, error: modelError } = await supabase.from("model").upsert({ make_id: make.id, name: modelName, normalized_name: modelName.toLowerCase(), category: parsed.data.category ?? null }, { onConflict: "make_id,normalized_name" }).select("id").single();
      if (modelError || !model) throw modelError;
      update.make_id = make.id;
      update.model_id = model.id;
    }
    const { error } = await supabase.from("vehicle").update(update).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Vehicle update failed", error);
    return NextResponse.json({ error: "Could not update this vehicle." }, { status: 503 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await authorizeStaffApi();
  if (!staff) return NextResponse.json({ error: "Administration access required." }, { status: 403 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid vehicle." }, { status: 400 });
  try {
    const supabase = createAdminClient();
    const [{ data: photos }, { data: documents }] = await Promise.all([
      supabase.from("vehicle_photo").select("storage_path").eq("vehicle_id", id),
      supabase.from("vehicle_document").select("storage_path").eq("vehicle_id", id),
    ]);
    const { error } = await supabase.from("vehicle").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "This vehicle has related business records and cannot be deleted." }, { status: 409 });
    if (photos?.length) await supabase.storage.from("vehicle-photos").remove(photos.map((photo) => photo.storage_path));
    if (documents?.length) await supabase.storage.from("vehicle-documents").remove(documents.map((document) => document.storage_path));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete this vehicle." }, { status: 503 });
  }
}
