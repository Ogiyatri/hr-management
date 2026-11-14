"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError, formObject, invalid, ok, zDate, zMoney, zOptUuid, zUuid, type ActionResult } from "@/lib/action";

const periodSchema = z
  .object({
    month: z.string({ error: "Wajib diisi" }).regex(/^\d{4}-\d{2}$/, "Pilih bulan"),
    branch_id: zOptUuid,
    start_date: zDate,
    end_date: zDate,
  })
  .refine((d) => d.end_date >= d.start_date, { message: "Tanggal akhir sebelum tanggal awal", path: ["end_date"] });

export async function createPeriod(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const me = await requireUser(["admin", "hr"]);
  const parsed = periodSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { month, branch_id, start_date, end_date } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payroll_periods")
    .insert({ period_month: `${month}-01`, branch_id: branch_id ?? null, start_date, end_date, created_by: me.employee?.id })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Periode untuk bulan & cabang ini sudah ada.", ts: Date.now() };
    return dbError(error);
  }
  redirect(`/payroll/${data.id}`);
}

export async function generatePayroll(periodId: string): Promise<ActionResult> {
  await requireUser(["admin", "hr"]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_payroll", { p_period_id: periodId });
  if (error) return dbError(error);
  revalidatePath(`/payroll/${periodId}`);
  return ok(`${data} slip gaji dihitung.`);
}

export async function setPeriodStatus(periodId: string, status: "draft" | "finalized" | "paid"): Promise<ActionResult> {
  await requireUser(["admin", "hr"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_payroll_status", { p_period_id: periodId, p_status: status });
  if (error) return dbError(error);
  revalidatePath(`/payroll/${periodId}`);
  revalidatePath("/payroll");
  return ok(
    status === "finalized" ? "Payroll difinalisasi. Slip bisa dilihat karyawan." : status === "paid" ? "Ditandai sudah dibayar." : "Payroll dibuka kembali (draft).",
  );
}

export async function deletePeriod(periodId: string): Promise<ActionResult> {
  await requireUser(["admin", "hr"]);
  const supabase = await createClient();
  const { error } = await supabase.from("payroll_periods").delete().eq("id", periodId).eq("status", "draft");
  if (error) return dbError(error);
  revalidatePath("/payroll");
  redirect("/payroll");
}

export async function addAdjustment(periodId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireUser(["admin", "hr"]);
  const parsed = z
    .object({ employee_id: zUuid, component_id: zUuid, amount: zMoney.refine((n) => n > 0, "Harus lebih dari 0"), note: z.string().max(200).optional() })
    .safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("payroll_adjustments").insert({ period_id: periodId, ...parsed.data });
  if (error) return dbError(error);
  revalidatePath(`/payroll/${periodId}`);
  return ok("Penyesuaian ditambahkan. Klik Hitung ulang agar masuk ke slip.");
}

export async function removeAdjustment(periodId: string, id: string): Promise<ActionResult> {
  await requireUser(["admin", "hr"]);
  const supabase = await createClient();
  const { error } = await supabase.from("payroll_adjustments").delete().eq("id", id);
  if (error) return dbError(error);
  revalidatePath(`/payroll/${periodId}`);
  return ok("Penyesuaian dihapus. Klik Hitung ulang.");
}
