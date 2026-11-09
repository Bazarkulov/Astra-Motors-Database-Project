import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // A missing Supabase configuration still clears the browser route on return.
  }
  return NextResponse.json({ ok: true });
}
