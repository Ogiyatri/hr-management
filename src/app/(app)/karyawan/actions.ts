"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, type AppRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authCallbackUrl, sendPasswordLink } from "@/lib/supabase/email-link";
import {
  dbError, fail, formObject, invalid, ok, zDate, zMoney, zOptUuid, zUuid, type ActionResult,
} from "@/lib/action";

const PTKP = ["TK/0", "TK/1", "TK/2", "TK/3", "K/0", "K/1", "K/2", "K/3"] as const;

const employeeSchema = z.object({
  employee_no: z.string({ error: "Wajib diisi" }).min(1, "Wajib diisi").max(30),
  full_name: z.string({ error: "Wajib diisi" }).min(2, "Nama terlalu pendek").max(120),
  email: z.email("Format email tidak valid").toLowerCase(),
  phone: z.string().max(30).optional(),
  nik: z.string().regex(/^\d{16}$/, "NIK harus 16 digit").optional(),
  npwp: z.string().max(30).optional(),
  gender: z.enum(["male", "female"]).optional(),
  birth_date: zDate.optional(),
  address: z.string().max(500).optional(),
  branch_id: zUuid,
  department_id: zOptUuid,
  position_id: zOptUuid,
  shift_id: zOptUuid,
  supervisor_id: zOptUuid,
  employment_type: z.enum(["permanent", "contract", "probation", "intern"]),
  join_date: zDate,
  end_date: zDate.optional(),
  ptkp_status: z.enum(PTKP),
  base_salary: zMoney.optional(),
  bank_name: z.string().max(50).optional(),
  bank_account: z.string().max(50).optional(),
  bpjs_kesehatan_no: z.string().max(30).optional(),
  bpjs_ketenagakerjaan_no: z.string().max(30).optional(),
});

/** Field opsional yang dikosongkan harus jadi null (bukan diabaikan) saat update. */
function nullify<T extends Record<string, unknown>>(data: T) {
  const out: Record<string, unknown> = { ...data };
  for (const k of Object.keys(employeeSchema.shape)) if (out[k] === undefined) out[k] = null;
  return out as { [K in keyof T]-?: undefined extends T[K] ? Exclude<T[K], undefined> | null : T[K] };
}

async function requireHR() {
  return requireUser(["admin", "hr"]);
}

export async function createEmployee(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireHR();
  const parsed = employeeSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.from("employees").insert(parsed.data).select("id").single();
  if (error) {
    if (error.code === "23505") return fail("No. karyawan, email, atau NIK sudah dipakai karyawan lain.");
    return dbError(error);
  }

  if (formData.get("send_invite") === "on") {
    const res = await inviteEmployee(data.id, (formData.get("role") as AppRole) || "employee");
    if (!res?.ok) {
      revalidatePath("/karyawan");
      redirect(`/karyawan/${data.id}?invite_error=1`);
    }
  }
  revalidatePath("/karyawan");
  redirect(`/karyawan/${data.id}?created=1`);
}

export async function updateEmployee(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireHR();
  const parsed = employeeSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  if (parsed.data.supervisor_id === id) return fail("Atasan tidak boleh diri sendiri.");

  const supabase = await createClient();
  const { error } = await supabase.from("employees").update(nullify(parsed.data)).eq("id", id);
  if (error) {
    if (error.code === "23505") return fail("No. karyawan, email, atau NIK sudah dipakai karyawan lain.");
    return dbError(error);
  }
  revalidatePath(`/karyawan/${id}`);
  revalidatePath("/karyawan");
  return ok("Data karyawan disimpan.");
}

export async function setEmployeeStatus(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireHR();
  const parsed = z
    .object({ status: z.enum(["active", "resigned", "terminated"]), end_date: zDate.optional() })
    .safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { status, end_date } = parsed.data;
  if (status !== "active" && !end_date) {
    return { ok: false, error: "Tanggal berakhir wajib diisi.", fieldErrors: { end_date: ["Wajib diisi"] }, ts: Date.now() };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("employees")
    .update({ status, end_date: status === "active" ? null : end_date })
    .eq("id", id);
  if (error) return dbError(error);
  revalidatePath(`/karyawan/${id}`);
  revalidatePath("/karyawan");
  return ok(status === "active" ? "Karyawan diaktifkan kembali." : "Status karyawan diperbarui. Akun tidak bisa login lagi.");
}

// ---------------------------------------------------------------------------
// Akun login
// ---------------------------------------------------------------------------
const ASSIGNABLE: Record<AppRole, AppRole[]> = {
  admin: ["employee", "manager", "hr", "admin"],
  hr: ["employee", "manager"],
  manager: [],
  employee: [],
};

/**
 * Undang karyawan via email (Supabase Auth admin). Memakai secret key, jadi
 * otorisasi dicek manual: pemanggil harus HR dan bisa melihat karyawan tsb (RLS).
 */
export async function inviteEmployee(employeeId: string, role: AppRole = "employee"): Promise<ActionResult> {
  const me = await requireHR();
  if (!ASSIGNABLE[me.role].includes(role)) return fail("Anda tidak boleh memberikan role tersebut.");

  const supabase = await createClient();
  const { data: emp } = await supabase.from("employees").select("id, email, user_id, status").eq("id", employeeId).single();
  if (!emp) return fail("Karyawan tidak ditemukan.");
  if (emp.status !== "active") return fail("Karyawan tidak aktif.");

  const admin = createAdminClient();
  let userId = emp.user_id;

  if (!userId) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(emp.email, {
      redirectTo: authCallbackUrl(),
    });
    if (error) {
      if (error.code === "email_exists" || /already/i.test(error.message)) {
        return fail("Email ini sudah punya akun. Gunakan email lain atau hubungi admin.");
      }
      return fail(`Gagal mengirim undangan: ${error.message}`);
    }
    userId = data.user.id;
    const { error: linkErr } = await admin.from("employees").update({ user_id: userId }).eq("id", employeeId);
    if (linkErr) return dbError(linkErr);
  } else {
    // Sudah punya akun: kirim ulang link atur password
    const { error } = await sendPasswordLink(emp.email);
    if (error) return fail(`Gagal mengirim email: ${error.message}`);
  }

  const { error: roleErr } = await admin.from("user_roles").upsert({ user_id: userId, role });
  if (roleErr) return dbError(roleErr);

  revalidatePath(`/karyawan/${employeeId}`);
  return ok(emp.user_id ? "Link atur password dikirim ulang." : "Undangan terkirim ke email karyawan.");
}

export async function inviteAction(employeeId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const role = (formData.get("role") as AppRole) || "employee";
  return inviteEmployee(employeeId, role);
}

export async function setRole(employeeId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const me = await requireHR();
  const role = formData.get("role") as AppRole;
  if (!ASSIGNABLE[me.role].includes(role)) return fail("Anda tidak boleh memberikan role tersebut.");

  const supabase = await createClient();
  const { data: emp } = await supabase.from("employees").select("user_id").eq("id", employeeId).single();
  if (!emp?.user_id) return fail("Karyawan belum punya akun.");
  if (emp.user_id === me.id) return fail("Tidak bisa mengubah role sendiri.");

  const admin = createAdminClient();
  const { data: current } = await admin.from("user_roles").select("role").eq("user_id", emp.user_id).maybeSingle();
  if (current && !ASSIGNABLE[me.role].includes(current.role)) return fail("Anda tidak boleh mengubah role pengguna ini.");

  const { error } = await admin.from("user_roles").upsert({ user_id: emp.user_id, role });
  if (error) return dbError(error);
  revalidatePath(`/karyawan/${employeeId}`);
  return ok("Role diperbarui.");
}

// ---------------------------------------------------------------------------
// Komponen gaji tetap
// ---------------------------------------------------------------------------
export async function upsertSalaryComponent(employeeId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireHR();
  const parsed = z.object({ component_id: zUuid, amount: zMoney }).safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase
    .from("employee_salary_components")
    .upsert({ employee_id: employeeId, ...parsed.data }, { onConflict: "employee_id,component_id" });
  if (error) return dbError(error);
  revalidatePath(`/karyawan/${employeeId}`);
  return ok("Komponen gaji disimpan.");
}

export async function removeSalaryComponent(employeeId: string, id: string): Promise<ActionResult> {
  await requireHR();
  const supabase = await createClient();
  const { error } = await supabase.from("employee_salary_components").delete().eq("id", id);
  if (error) return dbError(error);
  revalidatePath(`/karyawan/${employeeId}`);
  return ok("Komponen dihapus.");
}
