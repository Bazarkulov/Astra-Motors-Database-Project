"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

export function PaymentForm({ saleId }: { saleId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const paidAt = String(form.get("paidAt") ?? "");
    const payload = {
      amount: Number(form.get("amount")), paymentMethod: String(form.get("method") ?? "") || null,
      status: String(form.get("status")), paidAt: paidAt ? new Date(paidAt).toISOString() : null,
      externalReference: String(form.get("reference") ?? "") || null,
    };
    setPending(true); setError(null);
    try {
      const response = await fetch(`/api/admin/sales/${saleId}/payments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not record payment.");
      element.reset(); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not record payment."); }
    finally { setPending(false); }
  }
  return <form className="admin-form-card payment-form" onSubmit={submit}><span className="eyebrow">ADD PAYMENT RECORD</span><div className="admin-form-grid"><label>Amount<input name="amount" type="number" min="0.01" step="0.01" required /></label><label>Method<input name="method" maxLength={40} placeholder="Wire, check, etc." /></label><label>Status<select name="status" defaultValue="pending"><option value="pending">Pending</option><option value="paid">Paid</option><option value="failed">Failed</option><option value="refunded">Refunded</option><option value="void">Void</option></select></label><label>Paid at<input name="paidAt" type="datetime-local" /></label><label>Reference<input name="reference" maxLength={120} placeholder="Optional transaction reference" /></label></div>{error && <p className="form-error">{error}</p>}<button className="button button-dark" disabled={pending}>{pending ? "Saving…" : "Record payment"}<ArrowUpRight size={14} /></button></form>;
}
