"use client";

import { FormEvent, useState } from "react";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";

export function ContactForm({ vehicleId, testDrive = false }: { vehicleId?: string; testDrive?: boolean }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setPending(true);
    setMessage(null);
    const form = new FormData(formElement);
    const requestedAt = String(form.get("scheduledAt") ?? "");
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? "") || undefined,
      message: String(form.get("message") ?? ""),
      vehicleId: vehicleId || undefined,
      intent: testDrive ? "test_drive" : "inquiry",
      scheduledAt: requestedAt ? new Date(requestedAt).toISOString() : undefined,
      topic: String(form.get("topic") ?? "vehicle"),
      website: String(form.get("website") ?? ""),
    };
    try {
      const response = await fetch("/api/inquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "We couldn’t send your message. Please try again.");
      setSuccess(true);
      formElement.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We couldn’t send your message. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (success) return <div className="form-success"><CheckCircle2 size={26} /><span className="eyebrow">MESSAGE RECEIVED</span><h3>Thank you for<br /><em>getting in touch.</em></h3><p>Our team will follow up using the contact details you provided.</p><button className="text-link" onClick={() => setSuccess(false)} type="button">Send another message <ArrowUpRight size={14} /></button></div>;

  return <form className="contact-form" onSubmit={submit}>
    <label className="honeypot" aria-hidden="true">Leave this field blank<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <div className="form-row"><label>Your name<input name="name" autoComplete="name" required minLength={2} maxLength={120} placeholder="First and last name" /></label><label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></label></div>
    <div className="form-row"><label>Phone <span>(optional)</span><input name="phone" type="tel" autoComplete="tel" maxLength={40} placeholder="Your number" /></label>{testDrive ? <label>Preferred visit time <span>(optional)</span><input name="scheduledAt" type="datetime-local" /></label> : <label>What are you interested in?<select name="topic" defaultValue="vehicle"><option value="vehicle">A vehicle in the collection</option><option value="search">Finding a specific vehicle</option><option value="consign">Consigning a vehicle</option><option value="other">Something else</option></select></label>}</div>
    <label>How can we help?<textarea name="message" required minLength={10} maxLength={4000} rows={6} placeholder={testDrive ? "Tell us a little about your preferred visit." : "Tell us what you have in mind."} /></label>
    <p className="form-privacy">Your contact details are used only to respond to this enquiry.</p>
    {message && <p className="form-error" role="alert">{message}</p>}
    <button className="button button-dark" type="submit" disabled={pending}>{pending ? "Sending…" : testDrive ? "Request a test drive" : "Send your enquiry"} <ArrowUpRight size={15} /></button>
  </form>;
}
