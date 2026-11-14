import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isHR } from "@/lib/nav";
import { attendanceReport, leaveReport, payrollReport, type ReportFilter } from "../data";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isHR(user.role)) return new NextResponse("Forbidden", { status: 403 });

  const sp = req.nextUrl.searchParams;
  const start = sp.get("start") ?? "";
  const end = sp.get("end") ?? "";
  const year = Number(sp.get("year"));
  const branch = sp.get("branch") ?? undefined;
  if (!DATE.test(start) || !DATE.test(end) || !Number.isInteger(year)) return new NextResponse("Bad request", { status: 400 });
  const f: ReportFilter = { start, end, year, branch: branch && /^[0-9a-f-]{36}$/.test(branch) ? branch : undefined };

  const wb = new ExcelJS.Workbook();
  wb.creator = "HR Management";
  const money = "#,##0";
  const type = sp.get("type");
  let filename = "laporan";

  if (type === "attendance") {
    const rows = await attendanceReport(f);
    const ws = wb.addWorksheet("Rekap Absensi");
    ws.columns = [
      { header: "No. Karyawan", key: "employee_no", width: 14 },
      { header: "Nama", key: "full_name", width: 28 },
      { header: "Cabang", key: "branch_name", width: 18 },
      { header: "Departemen", key: "department_name", width: 18 },
      { header: "Hari Kerja", key: "working_days", width: 11 },
      { header: "Hadir", key: "present", width: 8 },
      { header: "Terlambat", key: "late", width: 10 },
      { header: "Total Telat (mnt)", key: "late_minutes", width: 16 },
      { header: "Cuti", key: "leave", width: 8 },
      { header: "Sakit", key: "sick", width: 8 },
      { header: "Alpa", key: "absent", width: 8 },
      { header: "Lembur (mnt)", key: "overtime_minutes", width: 13 },
    ];
    rows.forEach((r) => ws.addRow(r));
    filename = `rekap-absensi-${start}_${end}`;
  } else if (type === "leave") {
    const { types, rows } = await leaveReport(f);
    const ws = wb.addWorksheet(`Rekap Cuti ${year}`);
    ws.columns = [
      { header: "No. Karyawan", key: "no", width: 14 },
      { header: "Nama", key: "name", width: 28 },
      ...types.map((t) => ({ header: t, key: t, width: 16 })),
      { header: "Total (hari)", key: "total", width: 12 },
    ];
    rows.forEach((r) => ws.addRow({ no: r.no, name: r.name, ...r.byType, total: r.total }));
    filename = `rekap-cuti-${year}`;
  } else if (type === "payroll") {
    const rows = await payrollReport(f);
    const ws = wb.addWorksheet(`Rekap Gaji ${year}`);
    ws.columns = [
      { header: "Bulan", key: "month", width: 12 },
      { header: "Jumlah Karyawan", key: "count", width: 16 },
      { header: "Total Pendapatan", key: "earnings", width: 18, style: { numFmt: money } },
      { header: "BPJS Karyawan", key: "bpjsE", width: 16, style: { numFmt: money } },
      { header: "BPJS Perusahaan", key: "bpjsC", width: 16, style: { numFmt: money } },
      { header: "PPh 21", key: "pph", width: 15, style: { numFmt: money } },
      { header: "Gaji Bersih", key: "net", width: 18, style: { numFmt: money } },
    ];
    rows.forEach((r) => ws.addRow({ ...r, month: r.month.slice(0, 7) }));
    filename = `rekap-gaji-${year}`;
  } else {
    return new NextResponse("Bad request", { status: 400 });
  }

  wb.worksheets.forEach((ws) => {
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
  });
  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
    },
  });
}
