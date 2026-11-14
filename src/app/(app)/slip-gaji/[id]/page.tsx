import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { isHR } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { date, minutesToText, monthYear, number, rupiah } from "@/lib/format";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Slip Gaji" };

function Line({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-1 text-sm ${strong ? "font-semibold" : ""} ${muted ? "text-muted-foreground" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export default async function SlipDetailPage({ params }: PageProps<"/slip-gaji/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const supabase = await createClient();

  // Akses dijaga RLS: pemilik (periode final) atau HR cabangnya
  const [{ data: slip }, { data: items }] = await Promise.all([
    supabase
      .from("payslips")
      .select(
        "*, period:payroll_periods(period_month, start_date, end_date, status), employee:employees(full_name, employee_no, npwp, bank_name, bank_account, department:departments(name)), branch:branches(name, address)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("payslip_items").select("*").eq("payslip_id", id).order("sort_order"),
  ]);
  if (!slip) notFound();

  const earnings = (items ?? []).filter((i) => i.type === "earning" && !i.is_company_contribution);
  const deductions = (items ?? []).filter((i) => i.type === "deduction");
  const company = (items ?? []).filter((i) => i.is_company_contribution);

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="Slip gaji"
          back={isHR(user.role) ? { href: "/payroll", label: "Penggajian" } : { href: "/slip-gaji", label: "Slip Gaji" }}
          actions={<PrintButton />}
        />
      </div>

      <Card className="mx-auto max-w-3xl print:max-w-none print:shadow-none print:ring-0">
        <CardContent className="grid gap-6 py-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Building2 className="size-5" />
              </span>
              <div>
                <p className="font-semibold">{slip.branch?.name}</p>
                <p className="text-xs text-muted-foreground">{slip.branch?.address}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">SLIP GAJI</p>
              <p className="text-sm capitalize text-muted-foreground">{monthYear(slip.period?.period_month)}</p>
              {slip.period?.status === "draft" ? <p className="text-xs font-medium text-amber-600">DRAFT — belum final</p> : null}
            </div>
          </div>

          <div className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            <Line label="Nama" value={slip.employee?.full_name ?? ""} />
            <Line label="No. karyawan" value={slip.employee?.employee_no ?? ""} />
            <Line label="Jabatan" value={slip.position_name ?? "—"} />
            <Line label="Departemen" value={slip.employee?.department?.name ?? "—"} />
            <Line label="Status PTKP" value={`${slip.ptkp_status} (TER ${slip.ter_category})`} />
            <Line label="NPWP" value={slip.employee?.npwp ?? "—"} />
            <Line label="Periode absensi" value={`${date(slip.period?.start_date)} – ${date(slip.period?.end_date)}`} />
            <Line label="Rekening" value={slip.employee?.bank_account ? `${slip.employee.bank_name ?? ""} ${slip.employee.bank_account}` : "—"} />
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-3 text-center text-sm sm:grid-cols-5">
            <div><p className="text-xs text-muted-foreground">Hari kerja</p><p className="font-semibold">{slip.working_days}</p></div>
            <div><p className="text-xs text-muted-foreground">Hadir</p><p className="font-semibold">{slip.present_days}</p></div>
            <div><p className="text-xs text-muted-foreground">Cuti/sakit</p><p className="font-semibold">{slip.leave_days}</p></div>
            <div><p className="text-xs text-muted-foreground">Alpa</p><p className="font-semibold">{slip.absent_days}</p></div>
            <div><p className="text-xs text-muted-foreground">Telat</p><p className="font-semibold">{minutesToText(slip.late_minutes)}</p></div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-1 font-medium">Pendapatan</p>
              <Separator className="mb-1" />
              {earnings.map((i) => (
                <Line key={i.id} label={i.name} value={rupiah(i.amount)} />
              ))}
              <Separator className="my-1" />
              <Line label="Total pendapatan" value={rupiah(slip.total_earnings)} strong />
            </div>
            <div>
              <p className="mb-1 font-medium">Potongan</p>
              <Separator className="mb-1" />
              {deductions.map((i) => (
                <Line key={i.id} label={i.name} value={rupiah(i.amount)} />
              ))}
              <Separator className="my-1" />
              <Line label="Total potongan" value={rupiah(slip.total_deductions)} strong />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-primary p-4 text-primary-foreground">
            <span className="font-medium">Gaji bersih diterima</span>
            <span className="text-2xl font-semibold tabular-nums">{rupiah(slip.net_salary)}</span>
          </div>

          {company.length ? (
            <div>
              <p className="mb-1 text-sm font-medium">Iuran BPJS ditanggung perusahaan (tidak memotong gaji)</p>
              {company.map((i) => (
                <Line key={i.id} label={i.name.replace(" — perusahaan", "")} value={rupiah(i.amount)} muted />
              ))}
              <Line label={`Penghasilan bruto untuk PPh 21`} value={rupiah(slip.gross_taxable)} muted />
              {Number(slip.overtime_hours) ? <Line label="Jam lembur disetujui" value={`${number(slip.overtime_hours, 1)} jam`} muted /> : null}
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Dokumen ini dibuat otomatis oleh sistem dan sah tanpa tanda tangan. Pertanyaan terkait gaji silakan hubungi HR.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
