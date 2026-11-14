import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isHR } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";

/** Ekspor payroll ke Excel: sheet rekap + sheet daftar transfer bank. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/payroll/[id]/export">) {
  const user = await getCurrentUser();
  if (!user || !isHR(user.role)) return new NextResponse("Forbidden", { status: 403 });
  const { id } = await ctx.params;

  const supabase = await createClient();
  const [{ data: period }, { data: slips }] = await Promise.all([
    supabase.from("payroll_periods").select("period_month, branch:branches(name)").eq("id", id).maybeSingle(),
    supabase
      .from("payslips")
      .select("*, employee:employees(employee_no, full_name, npwp, bank_name, bank_account), branch:branches(name)")
      .eq("period_id", id),
  ]);
  if (!period) return new NextResponse("Not found", { status: 404 });
  const rows = (slips ?? []).sort((a, b) => (a.employee?.full_name ?? "").localeCompare(b.employee?.full_name ?? ""));

  const wb = new ExcelJS.Workbook();
  wb.creator = "HR Management";
  const money = "#,##0";

  const rekap = wb.addWorksheet("Rekap Gaji");
  rekap.columns = [
    { header: "No. Karyawan", key: "no", width: 14 },
    { header: "Nama", key: "name", width: 28 },
    { header: "Cabang", key: "branch", width: 18 },
    { header: "Jabatan", key: "position", width: 22 },
    { header: "PTKP", key: "ptkp", width: 8 },
    { header: "Hari Kerja", key: "wd", width: 10 },
    { header: "Hadir", key: "present", width: 8 },
    { header: "Alpa", key: "absent", width: 8 },
    { header: "Cuti", key: "leave", width: 8 },
    { header: "Telat (mnt)", key: "late", width: 11 },
    { header: "Lembur (jam)", key: "ot", width: 12 },
    { header: "Gaji Pokok", key: "base", width: 14, style: { numFmt: money } },
    { header: "Total Pendapatan", key: "earn", width: 16, style: { numFmt: money } },
    { header: "BPJS Karyawan", key: "bpjs_e", width: 14, style: { numFmt: money } },
    { header: "BPJS Perusahaan", key: "bpjs_c", width: 15, style: { numFmt: money } },
    { header: "Bruto PPh 21", key: "gross", width: 15, style: { numFmt: money } },
    { header: "PPh 21", key: "pph", width: 13, style: { numFmt: money } },
    { header: "Total Potongan", key: "ded", width: 15, style: { numFmt: money } },
    { header: "Gaji Bersih", key: "net", width: 15, style: { numFmt: money } },
  ];
  rows.forEach((s) =>
    rekap.addRow({
      no: s.employee?.employee_no, name: s.employee?.full_name, branch: s.branch?.name, position: s.position_name,
      ptkp: s.ptkp_status, wd: s.working_days, present: s.present_days, absent: s.absent_days, leave: s.leave_days,
      late: s.late_minutes, ot: Number(s.overtime_hours), base: Number(s.base_salary), earn: Number(s.total_earnings),
      bpjs_e: Number(s.bpjs_employee), bpjs_c: Number(s.bpjs_company), gross: Number(s.gross_taxable),
      pph: Number(s.pph21), ded: Number(s.total_deductions), net: Number(s.net_salary),
    }),
  );
  const total = rekap.addRow({ name: "TOTAL" });
  for (const key of ["base", "earn", "bpjs_e", "bpjs_c", "gross", "pph", "ded", "net"]) {
    const col = rekap.getColumn(key).letter;
    total.getCell(key).value = { formula: `SUM(${col}2:${col}${rows.length + 1})` };
  }
  total.font = { bold: true };
  rekap.getRow(1).font = { bold: true };
  rekap.views = [{ state: "frozen", ySplit: 1, xSplit: 2 }];

  const transfer = wb.addWorksheet("Transfer Bank");
  transfer.columns = [
    { header: "Nama", key: "name", width: 28 },
    { header: "Bank", key: "bank", width: 12 },
    { header: "No. Rekening", key: "acc", width: 20 },
    { header: "Nominal", key: "net", width: 15, style: { numFmt: money } },
  ];
  rows.forEach((s) =>
    transfer.addRow({ name: s.employee?.full_name, bank: s.employee?.bank_name ?? "", acc: s.employee?.bank_account ?? "", net: Number(s.net_salary) }),
  );
  transfer.getRow(1).font = { bold: true };

  const buf = await wb.xlsx.writeBuffer();
  const month = period.period_month.slice(0, 7);
  const branch = (period.branch?.name ?? "semua").toLowerCase().replace(/\s+/g, "-");
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="payroll-${month}-${branch}.xlsx"`,
    },
  });
}
