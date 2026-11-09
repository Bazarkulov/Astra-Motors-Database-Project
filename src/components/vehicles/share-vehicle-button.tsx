"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

export function ShareVehicleButton() {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return <button className="share-button" type="button" onClick={share}><Share2 size={16} />{copied ? "Link copied" : "Share listing"}</button>;
}
