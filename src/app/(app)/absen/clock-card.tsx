"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, CheckCircle2, Loader2, LogIn, LogOut, MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { clock } from "./actions";

type Branch = { name: string; latitude: number; longitude: number; radius_m: number; timezone: string };
type Props = {
  userId: string;
  branch: Branch;
  shift: { name: string; start_time: string; end_time: string } | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  todayStatus: string | null;
};

type Geo = { lat: number; lng: number; accuracy: number };

function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function getPosition(): Promise<Geo> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Perangkat tidak mendukung GPS."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) =>
        reject(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? "Izin lokasi ditolak. Aktifkan izin lokasi untuk situs ini di pengaturan browser."
              : "Gagal mendapatkan lokasi. Pastikan GPS aktif lalu coba lagi.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

function useClock(timeZone: string) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0); // isi segera setelah hydrate (hindari mismatch SSR)
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  if (!now) return { time: "--:--:--", date: "" };
  return {
    time: new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone }).format(now),
    date: new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone }).format(now),
  };
}

export function ClockCard({ userId, branch, shift, checkInAt, checkOutAt, todayStatus }: Props) {
  const router = useRouter();
  const { time, date } = useClock(branch.timezone);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraSession, setCameraSession] = useState(0);
  const [submitting, startSubmit] = useTransition();

  const type: "in" | "out" | null = !checkInAt ? (todayStatus && !["present", "late"].includes(todayStatus) ? null : "in") : !checkOutAt ? "out" : null;
  const distance = geo ? distanceM(geo, { lat: branch.latitude, lng: branch.longitude }) : null;
  const inRange = distance !== null && distance <= branch.radius_m;
  const fmt = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: branch.timezone }).format(new Date(iso)) : "—";

  async function locate() {
    setLocating(true);
    setGeoError(null);
    try {
      setGeo(await getPosition());
    } catch (e) {
      setGeoError((e as Error).message);
    } finally {
      setLocating(false);
    }
  }

  useEffect(() => {
    if (!type) return;
    const t = setTimeout(() => void locate(), 0);
    return () => clearTimeout(t);
  }, [type]);

  async function submit(photo: Blob) {
    if (!geo || !type) return;
    startSubmit(async () => {
      const supabase = createClient();
      const path = `${userId}/${new Date().toISOString().slice(0, 10)}-${type}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("attendance-photos")
        .upload(path, photo, { contentType: "image/jpeg", upsert: false });
      if (upErr) {
        toast.error("Gagal mengunggah foto. Periksa koneksi internet Anda.");
        return;
      }
      const res = await clock({ type, lat: geo.lat, lng: geo.lng, accuracy: geo.accuracy, photoPath: path });
      if (res?.ok) {
        toast.success(res.message);
        setCameraOpen(false);
        router.refresh();
      } else {
        toast.error(res?.error ?? "Absen gagal.");
      }
    });
  }

  return (
    <Card>
      <CardContent className="grid gap-6 py-2">
        <div className="text-center">
          <p className="font-mono text-5xl font-semibold tabular-nums tracking-tight">{time}</p>
          <p className="mt-1 text-sm text-muted-foreground">{date}</p>
          {shift ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Shift {shift.name}: {shift.start_time.slice(0, 5)}–{shift.end_time.slice(0, 5)}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Masuk</p>
            <p className="text-xl font-semibold tabular-nums">{fmt(checkInAt)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Pulang</p>
            <p className="text-xl font-semibold tabular-nums">{fmt(checkOutAt)}</p>
          </div>
        </div>

        {type ? (
          <>
            <div className="flex items-start gap-3 rounded-lg bg-muted p-3 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">{branch.name}</p>
                {locating ? (
                  <p className="text-muted-foreground">Mencari lokasi Anda…</p>
                ) : geoError ? (
                  <p className="text-destructive">{geoError}</p>
                ) : distance !== null ? (
                  <p className={inRange ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}>
                    {Math.round(distance)} m dari kantor {inRange ? "(dalam area)" : `(maks. ${branch.radius_m} m)`}
                    {geo && geo.accuracy > 100 ? ` · akurasi GPS rendah (±${Math.round(geo.accuracy)} m)` : ""}
                  </p>
                ) : null}
              </div>
              <Button variant="ghost" size="icon-sm" onClick={locate} disabled={locating} aria-label="Perbarui lokasi">
                <RefreshCw className={locating ? "animate-spin" : ""} />
              </Button>
            </div>

            <Button
              size="lg"
              className="h-14 text-base"
              disabled={!inRange || submitting}
              onClick={() => {
                setCameraSession((n) => n + 1); // key baru → state dialog (preview/error) ter-reset
                setCameraOpen(true);
              }}
            >
              {type === "in" ? <LogIn /> : <LogOut />}
              {type === "in" ? "Absen Masuk" : "Absen Pulang"}
            </Button>
          </>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 p-4 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="size-5" />
            {checkOutAt ? "Absensi hari ini sudah lengkap." : "Hari ini Anda tercatat cuti/izin."}
          </div>
        )}
      </CardContent>

      <SelfieDialog
        key={cameraSession}
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        submitting={submitting}
        onCapture={submit}
        title={type === "in" ? "Selfie absen masuk" : "Selfie absen pulang"}
      />
    </Card>
  );
}

function SelfieDialog({
  open,
  onOpenChange,
  onCapture,
  submitting,
  title,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCapture: (blob: Blob) => void;
  submitting: boolean;
  title: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(() =>
    typeof navigator !== "undefined" && !navigator.mediaDevices ? "Browser tidak mendukung kamera (butuh HTTPS). Gunakan Chrome/Safari terbaru." : null,
  );
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [ready, setReady] = useState(false); // video sudah punya frame → foto bisa diambil

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user", width: { ideal: 720 } }, audio: false })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError("Kamera tidak bisa dibuka. Izinkan akses kamera untuk situs ini."));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const scale = Math.min(1, 640 / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d")!;
    // mirror agar sama dengan preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => blob && setPreview({ url: URL.createObjectURL(blob), blob }),
      "image/jpeg",
      0.8,
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Pastikan wajah terlihat jelas.</DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-black">
          {error ? (
            <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white">{error}</p>
          ) : preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.url} alt="Pratinjau selfie" className="size-full object-cover" />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedData={() => setReady(true)}
              className="size-full -scale-x-100 object-cover"
            />
          )}
        </div>

        {preview ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setPreview(null)} disabled={submitting}>
              Ulangi
            </Button>
            <Button onClick={() => onCapture(preview.blob)} disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              Kirim
            </Button>
          </div>
        ) : (
          <Button size="lg" onClick={capture} disabled={Boolean(error) || !ready}>
            {ready || error ? <Camera /> : <Loader2 className="animate-spin" />}
            {ready || error ? "Ambil foto" : "Menyalakan kamera…"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
