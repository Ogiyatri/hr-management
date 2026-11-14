"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Crosshair, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/action-form";

/** Input lat/lng + tombol isi dari lokasi perangkat + tautan cek di Google Maps. */
export function LocationFields({ lat, lng }: { lat?: number; lng?: number }) {
  const [latitude, setLatitude] = useState(lat?.toString() ?? "");
  const [longitude, setLongitude] = useState(lng?.toString() ?? "");
  const [loading, setLoading] = useState(false);

  function useMyLocation() {
    if (!navigator.geolocation) return toast.error("Perangkat tidak mendukung GPS.");
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLatitude(p.coords.latitude.toFixed(6));
        setLongitude(p.coords.longitude.toFixed(6));
        setLoading(false);
        toast.success(`Lokasi diisi (akurasi ±${Math.round(p.coords.accuracy)} m)`);
      },
      () => {
        setLoading(false);
        toast.error("Gagal mengambil lokasi. Izinkan akses lokasi.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <div className="grid gap-2 sm:col-span-2">
      <div className="grid grid-cols-2 gap-3">
        <FormField name="latitude" label="Latitude">
          <Input id="latitude" name="latitude" inputMode="decimal" value={latitude} onChange={(e) => setLatitude(e.target.value)} required />
        </FormField>
        <FormField name="longitude" label="Longitude">
          <Input id="longitude" name="longitude" inputMode="decimal" value={longitude} onChange={(e) => setLongitude(e.target.value)} required />
        </FormField>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={loading}>
          <Crosshair /> Pakai lokasi saya sekarang
        </Button>
        {latitude && longitude ? (
          <a
            href={`https://www.google.com/maps?q=${latitude},${longitude}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
          >
            Cek di Google Maps <ExternalLink className="size-3" />
          </a>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">Tip: buka Google Maps, tekan lama titik kantor, lalu salin koordinatnya.</p>
    </div>
  );
}
