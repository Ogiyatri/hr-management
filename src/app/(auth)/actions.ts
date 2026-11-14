"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { canAccessApp, loadProfile, safeNextPath } from "@/lib/auth";
import { sendPasswordLink } from "@/lib/supabase/email-link";

export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  values?: Record<string, string>;
} | undefined;

const emailSchema = z.email("Format email tidak valid").trim().toLowerCase();

const passwordSchema = z
  .string()
  .min(8, "Minimal 8 karakter")
  .regex(/[a-z]/, "Harus ada huruf kecil")
  .regex(/[A-Z]/, "Harus ada huruf besar")
  .regex(/[0-9]/, "Harus ada angka");

// ---------------------------------------------------------------------------
// LOGIN
// ---------------------------------------------------------------------------
const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password wajib diisi"),
});

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: { email } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    // Pesan generik: jangan bocorkan apakah email terdaftar atau tidak
    const message =
      error?.code === "over_request_rate_limit" || error?.status === 429
        ? "Terlalu banyak percobaan. Coba lagi beberapa saat."
        : "Email atau password salah.";
    return { error: message, values: { email } };
  }

  const user = await loadProfile(supabase, data.user.id, data.user.email ?? parsed.data.email);
  if (!canAccessApp(user)) {
    await supabase.auth.signOut();
    return {
      error: "Akun Anda tidak aktif atau belum terhubung ke data karyawan. Hubungi HR.",
      values: { email },
    };
  }

  redirect(safeNextPath(formData.get("next")));
}

// ---------------------------------------------------------------------------
// LOGOUT
// ---------------------------------------------------------------------------
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------------------------------------------------------------------------
// LUPA PASSWORD
// ---------------------------------------------------------------------------
export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return { fieldErrors: { email: [parsed.error.issues[0].message] }, values: { email } };
  }

  const { error } = await sendPasswordLink(parsed.data);

  if (error && (error.code === "over_email_send_rate_limit" || error.status === 429)) {
    return { error: "Terlalu banyak permintaan. Coba lagi beberapa menit lagi.", values: { email } };
  }

  // Selalu tampilkan pesan yang sama agar tidak bisa dipakai menebak email terdaftar
  return {
    success: "Jika email tersebut terdaftar, link untuk mengatur ulang password sudah dikirim. Cek inbox/spam Anda.",
  };
}

// ---------------------------------------------------------------------------
// SET / RESET PASSWORD (dari link undangan atau lupa password)
// ---------------------------------------------------------------------------
const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((d) => d.password === d.confirm, {
    message: "Konfirmasi password tidak sama",
    path: ["confirm"],
  });

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    if (error.code === "same_password") {
      return { error: "Password baru tidak boleh sama dengan password lama." };
    }
    if (error.code === "weak_password") {
      return { error: "Password terlalu lemah. Gunakan kombinasi huruf besar, kecil, dan angka." };
    }
    if (error.code === "session_not_found" || error.status === 401) {
      return { error: "Link sudah kedaluwarsa. Minta link baru lewat halaman Lupa Password." };
    }
    return { error: "Gagal menyimpan password. Coba lagi." };
  }

  redirect("/dashboard");
}
