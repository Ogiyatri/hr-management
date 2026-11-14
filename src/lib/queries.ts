import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Data master untuk dropdown form. Di-cache per request. */
export const getOptions = cache(async () => {
  const supabase = await createClient();
  const [branches, departments, positions, shifts, employees, components, leaveTypes] = await Promise.all([
    supabase.from("branches").select("id, code, name, is_active").order("name"),
    supabase.from("departments").select("id, name").order("name"),
    supabase.from("positions").select("id, name, department_id, base_salary, level").order("name"),
    supabase.from("shifts").select("id, name, start_time, end_time, branch_id").order("name"),
    supabase.from("employees").select("id, full_name, employee_no, branch_id").eq("status", "active").order("full_name"),
    supabase.from("salary_components").select("id, code, name, type, is_fixed, is_taxable").order("type").order("name"),
    supabase.from("leave_types").select("id, code, name").order("name"),
  ]);
  return {
    branches: branches.data ?? [],
    departments: departments.data ?? [],
    positions: positions.data ?? [],
    shifts: shifts.data ?? [],
    employees: employees.data ?? [],
    components: components.data ?? [],
    leaveTypes: leaveTypes.data ?? [],
  };
});

export type Options = Awaited<ReturnType<typeof getOptions>>;

/** Ambil nilai string tunggal dari searchParams. */
export function param(v: string | string[] | undefined) {
  return typeof v === "string" && v !== "" ? v : undefined;
}
