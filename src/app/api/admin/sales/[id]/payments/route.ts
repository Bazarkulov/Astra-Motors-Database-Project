import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeStaffApi } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.string().trim().max(40).nullable().optional(),
  status: z.enum(["pending", "paid", "failed", "refunded", "void"]),
  paidAt: z.string().datetime().nullable().optional(),
  externalReference: z.string().trim().max(120).nullable().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await authorizeStaffApi();
  if (!staff) return NextResponse.json({ error: "Administration access required." }, { status: 403 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Sale not found." }, { status: 404 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Invalid payment details." }, { status: 400 }); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Check the payment details and try again." }, { status: 400 });
  try {
    const supabase = createAdminClient();
    const { data: sale } = await supabase.from("sale").select("id,currency,is_demo").eq("id", id).maybeSingle();
    if (!sale) return NextResponse.json({ error: "Sale not found." }, { status: 404 });
    const { error } = await supabase.from("payment").insert({
      sale_id: id,
      amount: parsed.data.amount,
      currency: sale.currency,
      payment_method: parsed.data.paymentMethod ?? null,
      status: parsed.data.status,
      paid_at: parsed.data.paidAt ?? null,
      external_reference: parsed.data.externalReference ?? null,
      is_demo: sale.is_demo,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not record this payment." }, { status: 503 });
  }
}
