"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError, fail, formObject, invalid, ok, zDate, zUuid, type ActionResult } from "@/lib/action";

const schema = z
  .object({
    leave_type_id: zUuid,
    start_date: zDate,
    end_date: zDate,
    reason: z.string({ error: "Alasan wajib diisi" }).min(3, "Alasan terlalu singkat").max(500),
  })
  .refine((d) => d.end_date >= d.start_date, { message: "Tanggal selesai sebelum tanggal mulai", path: ["end_date"] });

const MAX_FILE = 4 * 1024 * 1024;

export async function createLeave(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (!user.employee) return fail("Akun tidak terhubung ke data karyawan.");

  const parsed = schema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  let attachment_path: string | null = null;
  const file = formData.get("attachment");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE) return fail("Ukuran lampiran maksimal 4 MB.");
    if (!/^(image\/|application\/pdf)/.test(file.type)) return fail("Lampiran harus gambar atau PDF.");
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    attachment_path = `${user.id}/cuti/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("employee-documents").upload(attachment_path, file, { contentType: file.type });
    if (error) return fail("Gagal mengunggah lampiran.");
  }

  const { error } = await supabase
    .from("leave_requests")
    .insert({ ...parsed.data, employee_id: user.employee.id, attachment_path });

  if (error) {
    if (attachment_path) await supabase.storage.from("employee-documents").remove([attachment_path]);
    return dbError(error);
  }
  revalidatePath("/cuti");
  return ok("Pengajuan cuti terkirim ke atasan.");
}

export async function cancelLeave(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_leave", { p_request_id: id });
  if (error) return dbError(error);
  revalidatePath("/cuti");
  return ok("Pengajuan dibatalkan.");
}
