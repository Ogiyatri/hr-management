"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Hanya path internal yang boleh jadi tujuan (cegah open redirect). */
function safeNext(v: string | null) {
  return v && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : "/dashboard";
}

export function CallbackHandler() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const next = safeNext(new URLSearchParams(window.location.search).get("next"));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    const fail = (msg: string) => setTimeout(() => setError(msg), 0);
    if (hash.get("error")) {
      fail(hash.get("error_code") === "otp_expired" ? "Link sudah kedaluwarsa atau sudah pernah dipakai." : "Link tidak valid.");
      return;
    }
    if (!accessToken || !refreshToken) {
      fail("Link tidak valid.");
      return;
    }

    createClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: e }) => {
        if (e) return fail("Link tidak valid atau sudah kedaluwarsa.");
        // Hapus token dari riwayat browser, lalu muat ulang penuh agar server membaca cookie sesi
        window.location.replace(next);
      });
  }, []);

  if (error) {
    return (
      <div className="grid max-w-sm gap-3 text-center">
        <p className="font-medium">{error}</p>
        <p className="text-sm text-muted-foreground">Minta link baru lewat halaman lupa password atau hubungi HR.</p>
        <Link href="/forgot-password" className="text-sm text-primary underline-offset-4 hover:underline">
          Minta link baru
        </Link>
      </div>
    );
  }
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> Memverifikasi link…
    </p>
  );
}
