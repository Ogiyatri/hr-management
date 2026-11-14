"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError, fail, formObject, invalid, ok, zOptUuid, type ActionResult } from "@/lib/action";

const jobSchema = z.object({
  title: z.string({ error: "Wajib diisi" }).min(3, "Judul terlalu pendek").max(120),
  branch_id: zOptUuid,
  department_id: zOptUuid,
  position_id: zOptUuid,
  description: z.string().max(5000).optional(),
  requirements: z.string().max(5000).optional(),
  quota: z.coerce.number().int().min(1).max(999),
  status: z.enum(["draft", "open", "closed"]),
});

export async function saveJob(id: string | null, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const me = await requireUser(["admin", "hr"]);
  const parsed = jobSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  const row = {
    ...d,
    branch_id: d.branch_id ?? null,
    department_id: d.department_id ?? null,
    position_id: d.position_id ?? null,
    description: d.description ?? null,
    requirements: d.requirements ?? null,
  };
  const today = new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  if (id) {
    const { data: cur } = await supabase.from("job_postings").select("status, opened_at").eq("id", id).single();
    const { error } = await supabase
      .from("job_postings")
      .update({
        ...row,
        opened_at: d.status === "open" && !cur?.opened_at ? today : cur?.opened_at,
        closed_at: d.status === "closed" && cur?.status !== "closed" ? today : d.status === "closed" ? undefined : null,
      })
      .eq("id", id);
    if (error) return dbError(error);
    revalidatePath(`/rekrutmen/${id}`);
    revalidatePath("/rekrutmen");
    return ok("Lowongan disimpan.");
  }
  const { data, error } = await supabase
    .from("job_postings")
    .insert({ ...row, created_by: me.employee?.id, opened_at: d.status === "open" ? today : null })
    .select("id")
    .single();
  if (error) return dbError(error);
  redirect(`/rekrutmen/${data.id}`);
}

const applicantSchema = z.object({
  full_name: z.string({ error: "Wajib diisi" }).min(2).max(120),
  email: z.email("Format email tidak valid").toLowerCase(),
  phone: z.string().max(30).optional(),
  notes: z.string().max(2000).optional(),
});

export async function addApplicant(jobId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireUser(["admin", "hr"]);
  const parsed = applicantSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("applicants").insert({ job_posting_id: jobId, ...parsed.data });
  if (error) {
    if (error.code === "23505") return fail("Pelamar dengan email ini sudah ada di lowongan ini.");
    return dbError(error);
  }
  revalidatePath(`/rekrutmen/${jobId}`);
  return ok("Pelamar ditambahkan.");
}

const STAGES = ["applied", "screening", "interview", "offering", "hired", "rejected"] as const;

export async function updateApplicant(jobId: string, id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireUser(["admin", "hr"]);
  const parsed = z
    .object({
      stage: z.enum(STAGES),
      rating: z.coerce.number().int().min(1).max(5).optional(),
      notes: z.string().max(2000).optional(),
    })
    .safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  if (parsed.data.stage === "hired") return fail("Gunakan tombol “Terima jadi karyawan” untuk tahap Diterima.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("applicants")
    .update({ stage: parsed.data.stage, rating: parsed.data.rating ?? null, notes: parsed.data.notes ?? null })
    .eq("id", id);
  if (error) return dbError(error);
  revalidatePath(`/rekrutmen/${jobId}`);
  return ok("Pelamar diperbarui.");
}

/** Pelamar diterima → buat data karyawan (lengkapi di halaman karyawan). */
export async function hireApplicant(jobId: string, id: string): Promise<ActionResult> {
  await requireUser(["admin", "hr"]);
  const supabase = await createClient();
  const [{ data: app }, { data: job }, { data: last }, { data: defaultBranch }] = await Promise.all([
    supabase.from("applicants").select("*").eq("id", id).single(),
    supabase.from("job_postings").select("branch_id, department_id, position_id").eq("id", jobId).single(),
    supabase.from("employees").select("employee_no").like("employee_no", "EMP-%").order("employee_no", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("branches").select("id").eq("is_active", true).order("created_at").limit(1).maybeSingle(),
  ]);
  if (!app || !job) return fail("Data tidak ditemukan.");
  if (app.hired_employee_id) redirect(`/karyawan/${app.hired_employee_id}`);
  const branchId = job.branch_id ?? defaultBranch?.id;
  if (!branchId) return fail("Atur cabang pada lowongan terlebih dahulu.");

  const nextNo = `EMP-${String(Number(last?.employee_no?.replace(/\D/g, "") ?? 0) + 1).padStart(4, "0")}`;
  const { data: emp, error } = await supabase
    .from("employees")
    .insert({
      employee_no: nextNo,
      full_name: app.full_name,
      email: app.email,
      phone: app.phone,
      branch_id: branchId,
      department_id: job.department_id,
      position_id: job.position_id,
      employment_type: "probation",
      join_date: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return fail("Email pelamar sudah terdaftar sebagai karyawan.");
    return dbError(error);
  }
  await supabase.from("applicants").update({ stage: "hired", hired_employee_id: emp.id }).eq("id", id);
  revalidatePath(`/rekrutmen/${jobId}`);
  redirect(`/karyawan/${emp.id}?created=1`);
}
