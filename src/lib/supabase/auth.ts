import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type StaffSession = {
  id: string;
  authUserId: string;
  firstName: string;
  lastName: string;
  role: string;
};

export async function getStaffSession(): Promise<StaffSession | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: employee, error } = await supabase
      .from("employee")
      .select("id,auth_user_id,first_name,last_name,role,is_active")
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (error || !employee || !["admin", "manager"].includes(employee.role)) return null;
    return {
      id: employee.id,
      authUserId: user.id,
      firstName: employee.first_name,
      lastName: employee.last_name,
      role: employee.role,
    };
  } catch {
    return null;
  }
}

export async function requireStaff() {
  const staff = await getStaffSession();
  if (!staff) redirect("/admin/login");
  return staff;
}

export async function authorizeStaffApi() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: employee } = await supabase
    .from("employee")
    .select("id,role,is_active")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!employee || !["admin", "manager"].includes(employee.role)) return null;
  return { user, employee };
}
