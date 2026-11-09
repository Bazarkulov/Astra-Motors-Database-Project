import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeStaffApi } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const statusFields: Record<string, { table: string; field: string; values: string[] }> = {
  inquiries: { table: "inquiry", field: "status", values: ["new", "contacted", "in_progress", "completed", "cancelled"] },
  "test-drives": { table: "test_drive", field: "status", values: ["requested", "scheduled", "completed", "cancelled", "no_show"] },
  consignments: { table: "consignment", field: "status", values: ["draft", "active", "pending_sale", "sold", "withdrawn", "expired"] },
  sales: { table: "sale", field: "status", values: ["pending", "completed", "cancelled", "refunded"] },
  inspections: { table: "inspection", field: "result", values: ["pending", "passed", "passed_with_notes", "failed"] },
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ resource: string; id: string }> }) {
  const staff = await authorizeStaffApi();
  if (!staff) return NextResponse.json({ error: "Administration access required." }, { status: 403 });
  const { resource, id } = await params;
  const configuration = statusFields[resource];
  if (!configuration || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Record not found." }, { status: 404 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Invalid update." }, { status: 400 }); }
  const parsed = z.object({ value: z.string() }).safeParse(raw);
  if (!parsed.success || !configuration.values.includes(parsed.data.value)) return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
  if (resource === "sales") {
    const { error } = await createClient().then((client) => client.rpc("admin_update_sale_status", { p_sale_id: id, p_status: parsed.data.value }));
    if (error) return NextResponse.json({ error: "Could not update this sale." }, { status: 409 });
    return NextResponse.json({ ok: true });
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from(configuration.table).update({ [configuration.field]: parsed.data.value }).eq("id", id);
  if (error) return NextResponse.json({ error: "Could not update this record." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
