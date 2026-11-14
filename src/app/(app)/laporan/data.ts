import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ReportFilter = { start: string; end: string; branch?: string; year: number };

export async function attendanceReport(f: ReportFilter) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("attendance_recap", { p_start: f.start, p_end: f.end, p_branch_id: f.branch });
  return data ?? [];
}

export async function leaveReport(f: ReportFilter) {
  const supabase = await createClient();
  let q = supabase
    .from("leave_requests")
    .select("days, status, leave_type:leave_types(name), employee:employees!leave_requests_employee_id_fkey!inner(id, full_name, employee_no, branch_id)")
    .eq("status", "approved")
    .gte("start_date", `${f.year}-01-01`)
    .lte("start_date", `${f.year}-12-31`);
  if (f.branch) q = q.eq("employee.branch_id", f.branch);
  const { data } = await q;

  const types = new Set<string>();
  const byEmp = new Map<string, { name: string; no: string; total: number; byType: Record<string, number> }>();
  for (const r of data ?? []) {
    const t = r.leave_type?.name ?? "Lainnya";
    types.add(t);
    const key = r.employee.id;
    const row = byEmp.get(key) ?? { name: r.employee.full_name, no: r.employee.employee_no, total: 0, byType: {} };
    row.byType[t] = (row.byType[t] ?? 0) + Number(r.days);
    row.total += Number(r.days);
    byEmp.set(key, row);
  }
  return { types: [...types].sort(), rows: [...byEmp.values()].sort((a, b) => a.name.localeCompare(b.name)) };
}

export async function payrollReport(f: ReportFilter) {
  const supabase = await createClient();
  let q = supabase
    .from("payslips")
    .select("total_earnings, bpjs_employee, bpjs_company, pph21, net_salary, period:payroll_periods!inner(period_month, status)")
    .gte("period.period_month", `${f.year}-01-01`)
    .lte("period.period_month", `${f.year}-12-01`)
    .in("period.status", ["finalized", "paid"]);
  if (f.branch) q = q.eq("branch_id", f.branch);
  const { data } = await q;

  const byMonth = new Map<string, { month: string; count: number; earnings: number; bpjsE: number; bpjsC: number; pph: number; net: number }>();
  for (const s of data ?? []) {
    const m = s.period.period_month;
    const row = byMonth.get(m) ?? { month: m, count: 0, earnings: 0, bpjsE: 0, bpjsC: 0, pph: 0, net: 0 };
    row.count += 1;
    row.earnings += Number(s.total_earnings);
    row.bpjsE += Number(s.bpjs_employee);
    row.bpjsC += Number(s.bpjs_company);
    row.pph += Number(s.pph21);
    row.net += Number(s.net_salary);
    byMonth.set(m, row);
  }
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}
