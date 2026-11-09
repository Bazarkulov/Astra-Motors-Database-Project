"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

export function AdminCustomerForm({ id, firstName, lastName, email, phone }: { id: string; firstName: string; lastName: string; email: string; phone: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    setPending(true); setError(null);
    try {
      const response = await fetch(`/api/admin/customers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: form.get("firstName"), lastName: form.get("lastName"), email: form.get("email"), phone: String(form.get("phone") ?? "") || null }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Could not update customer.");
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update customer."); }
    finally { setPending(false); }
  }
  return <form className="admin-form-card" onSubmit={submit}><div className="admin-form-grid"><label>First name<input name="firstName" required maxLength={80} defaultValue={firstName} /></label><label>Last name<input name="lastName" required maxLength={80} defaultValue={lastName} /></label><label>Email<input name="email" type="email" required maxLength={254} defaultValue={email} /></label><label>Phone<input name="phone" maxLength={40} defaultValue={phone ?? ""} /></label></div>{error && <p className="form-error">{error}</p>}<div className="admin-form-actions"><button className="button button-dark" disabled={pending}>{pending ? "Saving…" : "Save contact details"}<ArrowUpRight size={14} /></button></div></form>;
}
