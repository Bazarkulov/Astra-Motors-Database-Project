"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RecordStatusSelect({ resource, id, value, values, label }: { resource: string; id: string; value: string; values: string[]; label?: string }) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  async function change(nextValue: string) {
    setError(null);
    const response = await fetch(`/api/admin/records/${resource}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: nextValue }) });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Update failed.");
    else router.refresh();
  }
  return <span className="record-status-control"><select aria-label={label ?? "Status"} value={value} onChange={(event) => change(event.target.value)}>{values.map((item) => <option value={item} key={item}>{item.replaceAll("_", " ")}</option>)}</select>{error && <small role="alert">{error}</small>}</span>;
}
