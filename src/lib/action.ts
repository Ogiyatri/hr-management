import { z } from "zod";

/** Hasil standar Server Action yang dipakai bersama <ActionForm>. */
export type ActionResult = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  /** penanda unik agar efek (toast/tutup dialog) jalan walau pesan sama */
  ts?: number;
} | undefined;

export const ok = (message?: string): ActionResult => ({ ok: true, message, ts: Date.now() });
export const fail = (error: string): ActionResult => ({ ok: false, error, ts: Date.now() });

export function invalid(error: z.ZodError): ActionResult {
  return {
    ok: false,
    error: "Periksa kembali isian yang ditandai.",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
    ts: Date.now(),
  };
}

/** Ubah pesan error Postgres/Supabase jadi pesan yang ramah. */
export function dbError(error: { message: string; code?: string } | null): ActionResult {
  if (!error) return fail("Terjadi kesalahan.");
  if (error.code === "23505") return fail("Data yang sama sudah ada.");
  if (error.code === "23503") return fail("Data masih dipakai di tempat lain, tidak bisa dihapus.");
  if (error.code === "42501") return fail("Anda tidak memiliki akses untuk tindakan ini.");
  // Pesan dari RAISE EXCEPTION di fungsi database sudah berbahasa Indonesia
  if (error.code === "P0001") return fail(error.message);
  return fail(error.message || "Terjadi kesalahan.");
}

/** FormData → object; string kosong jadi undefined. */
export function formObject(formData: FormData) {
  const obj: Record<string, string | undefined> = {};
  formData.forEach((v, k) => {
    if (typeof v === "string") obj[k] = v.trim() === "" ? undefined : v.trim();
  });
  return obj;
}

// Skema umum
export const zMoney = z.coerce.number({ error: "Harus angka" }).min(0, "Tidak boleh negatif");
export const zUuid = z.uuid("Pilih salah satu");
export const zOptUuid = z.uuid().optional();
export const zDate = z.iso.date("Tanggal tidak valid");
