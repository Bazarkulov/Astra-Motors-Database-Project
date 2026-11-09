"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gauge, LogOut, Menu, Package, Users, MessageSquare, CalendarDays, ClipboardCheck, FileText, HandCoins } from "lucide-react";
import { useState } from "react";

const links = [
  ["Overview", "/admin", Gauge], ["Inventory", "/admin/vehicles", Package], ["Inquiries", "/admin/inquiries", MessageSquare],
  ["Test drives", "/admin/test-drives", CalendarDays], ["Customers", "/admin/customers", Users],
  ["Consignments", "/admin/consignments", FileText], ["Sales", "/admin/sales", HandCoins], ["Inspections", "/admin/inspections", ClipboardCheck],
] as const;

export function AdminShell({ children, staffName, role }: { children: React.ReactNode; staffName: string; role: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }
  return <div className="admin-shell"><aside className={`admin-sidebar${open ? " is-open" : ""}`}><Link href="/admin" className="admin-brand"><span>M&H</span><small>DEALERSHIP OFFICE</small></Link><nav aria-label="Administration">{links.map(([label, href, Icon]) => <Link href={href} key={href} onClick={() => setOpen(false)}><Icon size={16} />{label}</Link>)}</nav><div className="admin-sidebar-bottom"><Link href="/" target="_blank">View public site ↗</Link><span>PRIVATE ADMINISTRATION</span></div></aside><div className="admin-main"><header className="admin-topbar"><button className="admin-menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation"><Menu size={19} /></button><div><span className="eyebrow">DEALERSHIP MANAGEMENT</span><strong>{staffName}</strong><small>{role}</small></div><button className="admin-logout" onClick={logout}><LogOut size={15} /> Sign out</button></header>{children}</div></div>;
}
