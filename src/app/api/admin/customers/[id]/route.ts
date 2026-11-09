import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeStaffApi } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).nullable(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await authorizeStaffApi()) return NextResponse.json({ error: "Administration access required." }, { status: 403 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Invalid customer details." }, { status: 400 }); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Check the contact details and try again." }, { status: 400 });
  const data = parsed.data;
  const { error } = await createAdminClient().from("customer").update({
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email,
    email_normalized: data.email.toLowerCase(),
    phone: data.phone || null,
  }).eq("id", id);
  if (error) return NextResponse.json({ error: "Could not update this customer. Check whether the email is already used." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
