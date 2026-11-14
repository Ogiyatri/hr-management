"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { dbError, fail, formObject, ok, type ActionResult } from "@/lib/action";

const schema = z.object({
  kind: z.enum(["leave", "overtime"]),
  id: z.uuid(),
  decision: z.enum(["approve", "reject"]),
  note: z.string().max(500).optional(),
});

/** Otorisasi (atasan langsung / HR) dicek di fungsi database decide_*. */
export async function decide(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = schema.safeParse(formObject(formData));
  if (!parsed.success) return fail("Data tidak valid.");
  const { kind, id, decision, note } = parsed.data;
  if (decision === "reject" && !note) {
    return { ok: false, error: "Alasan penolakan wajib diisi.", fieldErrors: { note: ["Wajib diisi saat menolak"] }, ts: Date.now() };
  }

  const supabase = await createClient();
  const args = { p_request_id: id, p_approve: decision === "approve", p_note: note };
  const { error } = kind === "leave" ? await supabase.rpc("decide_leave", args) : await supabase.rpc("decide_overtime", args);
  if (error) return dbError(error);

  revalidatePath("/persetujuan");
  revalidatePath("/dashboard");
  return ok(decision === "approve" ? "Pengajuan disetujui." : "Pengajuan ditolak.");
}
