import Link from "next/link";
import { AdminLoginForm } from "@/components/forms/admin-login-form";
import { SiteHeader } from "@/components/layout/site-header";
import { getStaffSession } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const staff = await getStaffSession();
  if (staff) redirect("/admin");
  const setupRequired = params.setup === "required";
  const nextPath = typeof params.next === "string" ? params.next : "/admin";
  return <><SiteHeader /><main className="admin-login-page"><div className="admin-login-card"><span className="eyebrow">MOTORS & HERITAGE — PRIVATE ACCESS</span><h1>Welcome<br /><em>back.</em></h1>{setupRequired ? <div className="notice-box"><p>Supabase is not configured yet. Add the project URL and anon key to `.env.local`, then add an authorized employee in the database.</p></div> : <><p>Sign in with your authorized staff account.</p><AdminLoginForm nextPath={nextPath} /></>}<Link className="text-link" href="/">Return to the public site</Link></div></main></>;
}
