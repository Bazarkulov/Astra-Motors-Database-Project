import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(8).max(128) });

export async function POST(request: NextRequest) {
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Invalid sign-in details." }, { status: 400 }); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
    if (error) return NextResponse.json({ error: "Email or password was not accepted." }, { status: 401 });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unable to confirm this session." }, { status: 401 });
    const { data: employee } = await supabase.from("employee").select("role,is_active").eq("auth_user_id", user.id).maybeSingle();
    if (!employee?.is_active || !["admin", "manager"].includes(employee.role)) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "This account does not have administration access." }, { status: 403 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Authentication is not configured. Please contact the administrator." }, { status: 503 });
  }
}
