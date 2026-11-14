"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError, fail, formObject, invalid, ok, zDate, zUuid, type ActionResult } from "@/lib/action";

const TZ_OFFSET: Record<string, string> = { "Asia/Jakarta": "+07:00", "Asia/Makassar": "+08:00", "Asia/Jayapura": "+09:00" };
const zTime = z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM").optional();

const schema = z.object({
  employee_id: zUuid,
  work_date: zDate,
  status: z.enum(["present", "late", "absent", "leave", "sick", "holiday"]),
  check_in: zTime,
  check_out: zTime,
  late_minutes: z.coerce.number().int().min(0).max(1440).optional(),
  note: z.string({ error: "Alasan koreksi wajib diisi" }).min(3, "Alasan koreksi wajib diisi").max(300),
});

/** Koreksi / input manual absensi oleh HR (tercatat di audit log). */
export async function saveAttendance(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const me = await requireUser(["admin", "hr"]);
  const parsed = schema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;

  const supabase = await createClient();
  const { data: emp } = await supabase.from("employees").select("branch_id, branch:branches(timezone)").eq("id", d.employee_id).single();
  if (!emp) return fail("Karyawan tidak ditemukan.");
  const off = TZ_OFFSET[emp.branch?.timezone ?? "Asia/Jakarta"] ?? "+07:00";
  const ts = (t?: string) => (t ? new Date(`${d.work_date}T${t}:00${off}`).toISOString() : null);
  if (d.check_in && d.check_out && d.check_out <= d.check_in) {
    return { ok: false, error: "Jam pulang harus setelah jam masuk.", fieldErrors: { check_out: ["Harus setelah jam masuk"] }, ts: Date.now() };
  }

  const { error } = await supabase.from("attendances").upsert(
    {
      employee_id: d.employee_id,
      branch_id: emp.branch_id,
      work_date: d.work_date,
      status: d.status,
      check_in_at: ts(d.check_in),
      check_out_at: ts(d.check_out),
      late_minutes: d.status === "late" ? (d.late_minutes ?? 0) : 0,
      note: `[Koreksi HR: ${me.employee?.fullName ?? me.email}] ${d.note}`,
    },
    { onConflict: "employee_id,work_date" },
  );
  if (error) return dbError(error);
  revalidatePath("/absensi");
  return ok("Absensi disimpan.");
}
