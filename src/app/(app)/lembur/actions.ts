"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError, fail, formObject, invalid, ok, zDate, type ActionResult } from "@/lib/action";

const schema = z.object({
  work_date: zDate,
  hours: z.coerce.number({ error: "Harus angka" }).min(0.5, "Minimal 0,5 jam").max(12, "Maksimal 12 jam"),
  reason: z.string({ error: "Alasan wajib diisi" }).min(3, "Alasan terlalu singkat").max(500),
});

export async function createOvertime(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (!user.employee) return fail("Akun tidak terhubung ke data karyawan.");
  const parsed = schema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("overtime_requests").insert({ ...parsed.data, employee_id: user.employee.id });
  if (error) {
    if (error.code === "23505") return fail("Sudah ada pengajuan lembur di tanggal tersebut.");
    return dbError(error);
  }
  revalidatePath("/lembur");
  return ok("Pengajuan lembur terkirim ke atasan.");
}

export async function cancelOvertime(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_overtime", { p_request_id: id });
  if (error) return dbError(error);
  revalidatePath("/lembur");
  return ok("Pengajuan dibatalkan.");
}
