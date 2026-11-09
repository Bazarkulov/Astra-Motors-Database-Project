"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

export function AdminLoginForm({ nextPath }: { nextPath: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to sign in.");
      router.replace(nextPath.startsWith("/admin") && !nextPath.startsWith("/admin/login") ? nextPath : "/admin");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.");
    } finally {
      setPending(false);
    }
  }

  return <form className="admin-login-form" onSubmit={submit}><label>Email<input type="email" name="email" autoComplete="username" required maxLength={254} /></label><label>Password<input type="password" name="password" autoComplete="current-password" required minLength={8} maxLength={128} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in to dashboard"}<ArrowUpRight size={15} /></button></form>;
}
