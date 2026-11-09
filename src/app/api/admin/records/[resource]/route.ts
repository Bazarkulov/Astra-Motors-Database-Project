import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeStaffApi } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const id = z.string().uuid();
const consignmentSchema = z.object({
  vehicleId: id,
  sellerCustomerId: id,
  agreementDate: z.string().date(),
  askingPrice: z.number().positive(),
  commissionRate: z.number().min(0).max(100),
  status: z.enum(["draft", "active"]),
  notes: z.string().max(4000).nullable().optional(),
});
const saleSchema = z.object({
  vehicleId: id,
  buyerCustomerId: id,
  saleDate: z.string().datetime().nullable(),
  salePrice: z.number().positive(),
  status: z.enum(["pending", "completed"]),
  notes: z.string().max(4000).nullable().optional(),
}).refine((sale) => sale.status !== "completed" || sale.saleDate !== null, { message: "Completed sales need a sale date." });
const inspectionSchema = z.object({
  vehicleId: id,
  inspectionDate: z.string().date(),
  result: z.enum(["pending", "passed", "passed_with_notes", "failed"]),
  notes: z.string().max(4000).nullable().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const staff = await authorizeStaffApi();
  if (!staff) return NextResponse.json({ error: "Administration access required." }, { status: 403 });
  const { resource } = await params;
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Invalid record details." }, { status: 400 }); }

  if (resource === "consignments") {
    const parsed = consignmentSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: "Check the consignment details and try again." }, { status: 400 });
    try {
      const admin = createAdminClient();
      const [{ data: vehicle }, { data: seller }] = await Promise.all([
        admin.from("vehicle").select("is_demo").eq("id", parsed.data.vehicleId).maybeSingle(),
        admin.from("customer").select("is_demo").eq("id", parsed.data.sellerCustomerId).maybeSingle(),
      ]);
      if (!vehicle || !seller || vehicle.is_demo || seller.is_demo) return NextResponse.json({ error: "Choose real inventory and a real customer for a live consignment." }, { status: 400 });
      const { data, error } = await admin.from("consignment").insert({
        vehicle_id: parsed.data.vehicleId,
        seller_customer_id: parsed.data.sellerCustomerId,
        agreement_date: parsed.data.agreementDate,
        asking_price: parsed.data.askingPrice,
        commission_rate: parsed.data.commissionRate,
        status: parsed.data.status,
        notes: parsed.data.notes ?? null,
      }).select("id").single();
      if (error || !data) throw error;
      return NextResponse.json({ id: data.id }, { status: 201 });
    } catch {
      return NextResponse.json({ error: "Could not create consignment. This vehicle may already have an active agreement." }, { status: 409 });
    }
  }

  if (resource === "sales") {
    const parsed = saleSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: "Check the sale details and try again." }, { status: 400 });
    try {
      const admin = createAdminClient();
      const [{ data: vehicle }, { data: buyer }] = await Promise.all([
        admin.from("vehicle").select("is_demo").eq("id", parsed.data.vehicleId).maybeSingle(),
        admin.from("customer").select("is_demo").eq("id", parsed.data.buyerCustomerId).maybeSingle(),
      ]);
      if (!vehicle || !buyer || vehicle.is_demo || buyer.is_demo) return NextResponse.json({ error: "Choose real inventory and a real customer for a live sale." }, { status: 400 });
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("admin_record_sale", {
        p_vehicle_id: parsed.data.vehicleId,
        p_buyer_customer_id: parsed.data.buyerCustomerId,
        p_employee_id: staff.employee.id,
        p_sale_date: parsed.data.saleDate,
        p_sale_price: parsed.data.salePrice,
        p_status: parsed.data.status,
        p_notes: parsed.data.notes ?? null,
      });
      if (error || !data) throw error;
      return NextResponse.json({ id: data }, { status: 201 });
    } catch {
      return NextResponse.json({ error: "Could not record sale. Confirm the vehicle is available and has no active sale." }, { status: 409 });
    }
  }

  if (resource === "inspections") {
    const parsed = inspectionSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: "Check the inspection details and try again." }, { status: 400 });
    try {
      const admin = createAdminClient();
      const { data: vehicle } = await admin.from("vehicle").select("is_demo").eq("id", parsed.data.vehicleId).maybeSingle();
      if (!vehicle || vehicle.is_demo) return NextResponse.json({ error: "Choose a real vehicle for a live inspection record." }, { status: 400 });
      const { data, error } = await admin.from("inspection").insert({
        vehicle_id: parsed.data.vehicleId,
        inspector_id: staff.employee.id,
        inspection_date: parsed.data.inspectionDate,
        result: parsed.data.result,
        notes: parsed.data.notes ?? null,
      }).select("id").single();
      if (error || !data) throw error;
      return NextResponse.json({ id: data.id }, { status: 201 });
    } catch {
      return NextResponse.json({ error: "Could not record inspection." }, { status: 503 });
    }
  }

  return NextResponse.json({ error: "Unsupported record type." }, { status: 404 });
}
