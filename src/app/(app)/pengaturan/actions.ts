"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError, fail, formObject, invalid, ok, zDate, zMoney, zOptUuid, type ActionResult } from "@/lib/action";

const bool = z.preprocess((v) => v === "on" || v === "true", z.boolean());
const zTime = z.string({ error: "Wajib diisi" }).regex(/^\d{2}:\d{2}(:\d{2})?$/, "Format jam HH:MM");

/** Skema per tabel master. Validasi bisnis lain ada di constraint database. */
const SCHEMAS = {
  branches: z.object({
    code: z.string({ error: "Wajib diisi" }).min(1).max(10).toUpperCase(),
    name: z.string({ error: "Wajib diisi" }).min(2).max(100),
    address: z.string().max(300).optional(),
    latitude: z.coerce.number({ error: "Harus angka" }).min(-90).max(90),
    longitude: z.coerce.number({ error: "Harus angka" }).min(-180).max(180),
    radius_m: z.coerce.number({ error: "Harus angka" }).int().min(10, "Minimal 10 m").max(5000),
    timezone: z.enum(["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"]),
    is_active: bool,
  }),
  departments: z.object({ name: z.string({ error: "Wajib diisi" }).min(2).max(100) }),
  positions: z.object({
    name: z.string({ error: "Wajib diisi" }).min(2).max(100),
    department_id: zOptUuid,
    level: z.coerce.number().int().min(1).max(20),
    base_salary: zMoney,
  }),
  shifts: z.object({
    name: z.string({ error: "Wajib diisi" }).min(2).max(50),
    start_time: zTime,
    end_time: zTime,
    late_tolerance_minutes: z.coerce.number().int().min(0).max(240),
    branch_id: zOptUuid,
  }),
  holidays: z.object({
    date: zDate,
    name: z.string({ error: "Wajib diisi" }).min(2).max(100),
    branch_id: zOptUuid,
  }),
  leave_types: z.object({
    code: z.string({ error: "Wajib diisi" }).min(2).max(20).toUpperCase(),
    name: z.string({ error: "Wajib diisi" }).min(2).max(100),
    default_quota: z.coerce.number().int().min(0).max(365).optional(),
    is_paid: bool,
    requires_attachment: bool,
  }),
  salary_components: z.object({
    code: z.string({ error: "Wajib diisi" }).min(2).max(20).toUpperCase(),
    name: z.string({ error: "Wajib diisi" }).min(2).max(100),
    type: z.enum(["earning", "deduction"]),
    is_taxable: bool,
    is_fixed: bool,
  }),
} as const;

export type MasterTable = keyof typeof SCHEMAS;

export async function saveMaster(
  table: MasterTable,
  id: string | null,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser(["admin", "hr"]);
  const schema = SCHEMAS[table];
  if (!schema) return fail("Tabel tidak dikenal.");
  const parsed = schema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  // Field opsional yang dikosongkan → null
  const data: Record<string, unknown> = { ...parsed.data };
  for (const k of Object.keys(schema.shape)) if (data[k] === undefined) data[k] = null;

  const supabase = await createClient();
  // Tabel dipilih dari whitelist SCHEMAS; tipe kolom divalidasi oleh zod di atas.
  const q = supabase.from(table) as unknown as {
    insert: (v: unknown) => Promise<{ error: { message: string; code?: string } | null }>;
    update: (v: unknown) => { eq: (c: string, v: string) => Promise<{ error: { message: string; code?: string } | null }> };
  };
  const { error } = id ? await q.update(data).eq("id", id) : await q.insert(data);
  if (error) return dbError(error);
  revalidatePath("/pengaturan");
  return ok("Tersimpan.");
}

export async function deleteMaster(table: MasterTable, id: string): Promise<ActionResult> {
  await requireUser(["admin", "hr"]);
  if (!(table in SCHEMAS)) return fail("Tabel tidak dikenal.");
  const supabase = await createClient();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return dbError(error);
  revalidatePath("/pengaturan");
  return ok("Dihapus.");
}

export async function savePayrollSettings(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireUser(["admin", "hr"]);
  const entries: { key: string; value: number }[] = [];
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("s_") || typeof v !== "string") continue;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return fail(`Nilai ${k.slice(2)} tidak valid.`);
    entries.push({ key: k.slice(2), value: n });
  }
  const supabase = await createClient();
  for (const e of entries) {
    const { error } = await supabase.from("payroll_settings").update({ value: e.value, updated_at: new Date().toISOString() }).eq("key", e.key);
    if (error) return dbError(error);
  }
  revalidatePath("/pengaturan");
  return ok("Parameter payroll disimpan.");
}
