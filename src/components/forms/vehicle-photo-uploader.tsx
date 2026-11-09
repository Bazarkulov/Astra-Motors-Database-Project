"use client";

import { ChangeEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowUpRight, ImagePlus } from "lucide-react";

export function VehiclePhotoUploader({ vehicleId }: { vehicleId: string }) {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setNotice(null);
    if (!file.type.startsWith("image/") || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setNotice("Choose a JPEG, PNG or WebP image."); return;
    }
    if (file.size > 15 * 1024 * 1024) { setNotice("Image files must be 15 MB or smaller."); return; }
    setPending(true);
    const extension = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${vehicleId}/${crypto.randomUUID()}.${extension}`;
    try {
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage.from("vehicle-photos").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { count } = await supabase.from("vehicle_photo").select("id", { count: "exact", head: true }).eq("vehicle_id", vehicleId);
      const { error: insertError } = await supabase.from("vehicle_photo").insert({ vehicle_id: vehicleId, storage_path: path, alt_text: null, sort_order: count ?? 0, is_primary: count === 0 });
      if (insertError) { await supabase.storage.from("vehicle-photos").remove([path]); throw insertError; }
      setNotice("Photo uploaded. It will appear on the public listing when the vehicle is published.");
      event.target.value = "";
    } catch {
      setNotice("Upload failed. Confirm your staff access and try again.");
    } finally { setPending(false); }
  }

  return <div className="photo-upload"><label className="button button-outline"><ImagePlus size={16} />{pending ? "Uploading…" : "Add a vehicle photo"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={pending} /></label><p>Use only photos supplied by the dealership or cleared for reuse. JPEG, PNG or WebP up to 15 MB.</p>{notice && <span role="status">{notice} <ArrowUpRight size={13} /></span>}</div>;
}
