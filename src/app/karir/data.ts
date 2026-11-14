import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Hanya kolom aman dari lowongan berstatus "open" yang diekspos ke publik. */
const PUBLIC_COLUMNS = "id, title, description, requirements, quota, opened_at, branch:branches(name), department:departments(name)";

export async function getOpenJobs() {
  const { data } = await createAdminClient()
    .from("job_postings")
    .select(PUBLIC_COLUMNS)
    .eq("status", "open")
    .order("opened_at", { ascending: false });
  return data ?? [];
}

export async function getOpenJob(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createAdminClient().from("job_postings").select(PUBLIC_COLUMNS).eq("id", id).eq("status", "open").maybeSingle();
  return data;
}
