import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const submissionSchema = z.object({
  name: z.string().trim().min(2).max(120).refine((name) => name.split(/\s+/).length > 1),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(10).max(4000),
  vehicleId: z.string().uuid().optional(),
  intent: z.enum(["inquiry", "test_drive"]).default("inquiry"),
  scheduledAt: z.string().datetime().optional(),
  topic: z.enum(["vehicle", "search", "consign", "other"]).optional(),
  website: z.string().max(0).optional(),
}).refine((submission) => submission.intent !== "test_drive" || Boolean(submission.vehicleId), {
  message: "A vehicle is required for a test-drive request.",
});

const windowMs = 10 * 60 * 1000;
const maxSubmissions = 5;
const submissions = new Map<string, { count: number; expiresAt: number }>();

function clientAddress(request: NextRequest) {
  return request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function allowedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!allowedOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const now = Date.now();
  const address = clientAddress(request);
  const current = submissions.get(address);
  if (current && current.expiresAt > now && current.count >= maxSubmissions) {
    return NextResponse.json({ error: "Please wait a little before sending another message." }, { status: 429 });
  }
  submissions.set(address, current && current.expiresAt > now ? { ...current, count: current.count + 1 } : { count: 1, expiresAt: now + windowMs });
  for (const [key, value] of submissions) if (value.expiresAt <= now) submissions.delete(key);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  }
  const parsed = submissionSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Please check the details and try again." }, { status: 400 });

  const submission = parsed.data;
  if (submission.scheduledAt && new Date(submission.scheduledAt).getTime() <= now) {
    return NextResponse.json({ error: "Please choose a future visit time." }, { status: 400 });
  }
  const [firstName, ...lastNameParts] = submission.name.split(/\s+/);
  const lastName = lastNameParts.join(" ");
  const email = submission.email.trim();

  try {
    const supabase = createAdminClient();
    const customerPayload: Record<string, string> = {
      first_name: firstName,
      last_name: lastName,
      email,
      email_normalized: email.toLowerCase(),
    };
    if (submission.phone) customerPayload.phone = submission.phone;

    const { data: insertedCustomer, error: customerError } = await supabase
      .from("customer")
      .upsert(customerPayload, { onConflict: "email_normalized", ignoreDuplicates: true })
      .select("id")
      .maybeSingle();
    if (customerError) throw new Error("Unable to save customer inquiry.");
    const { data: existingCustomer } = insertedCustomer ? { data: null } : await supabase
      .from("customer")
      .select("id")
      .eq("email_normalized", email.toLowerCase())
      .maybeSingle();
    const customer = insertedCustomer ?? existingCustomer;
    if (!customer) throw new Error("Unable to save customer inquiry.");

    if (submission.intent === "test_drive") {
      const { error } = await supabase.from("test_drive").insert({
        customer_id: customer.id,
        vehicle_id: submission.vehicleId,
        scheduled_at: submission.scheduledAt ?? null,
        notes: submission.message,
      });
      if (error) throw new Error("Unable to save test drive request.");
    } else {
      const subjects: Record<string, string> = {
        vehicle: "Vehicle enquiry",
        search: "Vehicle search request",
        consign: "Consignment enquiry",
        other: "General enquiry",
      };
      const { error } = await supabase.from("inquiry").insert({
        customer_id: customer.id,
        vehicle_id: submission.vehicleId,
        subject: subjects[submission.topic ?? "vehicle"],
        message: submission.message,
      });
      if (error) throw new Error("Unable to save inquiry.");
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Public inquiry submission failed", error);
    return NextResponse.json({ error: "We couldn’t save your message right now. Please try again later." }, { status: 503 });
  }
}
