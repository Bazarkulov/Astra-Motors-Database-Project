"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

export function SaveVehicleButton({ vehicleId }: { vehicleId: string }) {
  const [saved, setSaved] = useState(false);
  const key = "motors-heritage-saved-vehicles";

  useEffect(() => {
    try {
      const ids: string[] = JSON.parse(window.localStorage.getItem(key) ?? "[]");
      setSaved(ids.includes(vehicleId));
    } catch {
      window.localStorage.removeItem(key);
    }
  }, [vehicleId]);

  function toggle() {
    let ids: string[] = [];
    try { ids = JSON.parse(window.localStorage.getItem(key) ?? "[]"); } catch { window.localStorage.removeItem(key); }
    const next = saved ? ids.filter((id) => id !== vehicleId) : [...new Set([...ids, vehicleId])];
    window.localStorage.setItem(key, JSON.stringify(next));
    setSaved(!saved);
  }

  return <button className={`save-button${saved ? " is-saved" : ""}`} type="button" onClick={toggle} aria-pressed={saved}><Heart size={17} fill={saved ? "currentColor" : "none"} />{saved ? "Saved on this device" : "Save this vehicle"}</button>;
}
