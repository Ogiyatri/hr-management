"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, formObject, invalid, ok, type ActionResult } from "@/lib/action";

const MAX_CV = 4 * 1024 * 1024;

const schema = z.object({
  full_name: z.string({ error: "Nama wajib diisi" }).min(2, "Nama terlalu pendek").max(120),
  email: z.email("Format email tidak valid").toLowerCase(),
  phone: z.string({ error: "No. HP wajib diisi" }).regex(/^[0-9+\-\s]{8,20}$/, "No. HP tidak valid"),
  notes: z.string().max(1000).optional(),
});

/**
 * Lamaran dari halaman karier publik (tanpa login). Memakai secret key, jadi
 * semua input divalidasi ketat dan lowongan harus berstatus "open".
 */
export async function apply(jobId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  // Honeypot: field tersembunyi yang hanya diisi bot
  if (formData.get("website")) return ok("Lamaran terkirim.");

  const parsed = schema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const cv = formData.get("cv");
  if (!(cv instanceof File) || cv.size === 0) {
    return { ok: false, error: "CV wajib diunggah.", fieldErrors: { cv: ["Unggah CV dalam format PDF"] }, ts: Date.now() };
  }
  if (cv.size > MAX_CV) return { ok: false, error: "Ukuran CV maksimal 4 MB.", fieldErrors: { cv: ["Maksimal 4 MB"] }, ts: Date.now() };
  // Cek magic bytes PDF, bukan hanya MIME dari browser
  const head = new Uint8Array(await cv.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...head) !== "%PDF-") {
    return { ok: false, error: "CV harus berupa file PDF.", fieldErrors: { cv: ["Format harus PDF"] }, ts: Date.now() };
  }

  const admin = createAdminClient();
  const { data: job } = await admin.from("job_postings").select("id").eq("id", jobId).eq("status", "open").maybeSingle();
  if (!job) return fail("Lowongan sudah ditutup.");

  const { data: existing } = await admin
    .from("applicants")
    .select("id")
    .eq("job_posting_id", jobId)
    .eq("email", parsed.data.email)
    .maybeSingle();
  if (existing) return fail("Anda sudah melamar di lowongan ini dengan email tersebut.");

  const path = `${jobId}/${crypto.randomUUID()}.pdf`;
  const { error: upErr } = await admin.storage.from("applicant-cvs").upload(path, cv, { contentType: "application/pdf" });
  if (upErr) return fail("Gagal mengunggah CV. Coba lagi.");

  const { error } = await admin.from("applicants").insert({ job_posting_id: jobId, ...parsed.data, cv_path: path });
  if (error) {
    await admin.storage.from("applicant-cvs").remove([path]);
    return fail(error.code === "23505" ? "Anda sudah melamar di lowongan ini." : "Gagal mengirim lamaran. Coba lagi.");
  }
  return ok("Lamaran terkirim! Tim HR akan menghubungi Anda bila lolos seleksi.");
}
