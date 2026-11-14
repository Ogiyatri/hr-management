import type { Metadata } from "next";
import { CallbackHandler } from "./callback-handler";

export const metadata: Metadata = { title: "Memverifikasi…" };

/**
 * Tujuan link undangan / lupa password dari template email BAWAAN Supabase.
 * Token dikirim di fragmen URL (#access_token=…) yang hanya terbaca di browser,
 * jadi diproses di client lalu sesi disimpan ke cookie.
 * (Template kustom memakai /auth/confirm?token_hash=… yang diproses di server.)
 */
export default function AuthCallbackPage() {
  return (
    <main className="grid min-h-svh place-items-center bg-muted/40 px-4">
      <CallbackHandler />
    </main>
  );
}
