import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calculator, CheckCircle2, Download, Lock, Plus, RotateCcw, Trash2, Wallet } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormField } from "@/components/action-form";
import { ActionButton, FormDialog } from "@/components/form-dialog";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOptions } from "@/lib/queries";
import { PAYROLL_STATUS, date, monthYear, number, rupiah } from "@/lib/format";
import { addAdjustment, deletePeriod, generatePayroll, removeAdjustment, setPeriodStatus } from "../actions";

export const metadata: Metadata = { title: "Detail Payroll" };

export default async function PayrollDetailPage({ params }: PageProps<"/payroll/[id]">) {
  await requireUser(["admin", "hr"]);
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: period }, { data: slips }, { data: adjustments }, options] = await Promise.all([
    supabase.from("payroll_periods").select("*, branch:branches(name)").eq("id", id).maybeSingle(),
    supabase
      .from("payslips")
      .select("id, working_days, present_days, absent_days, leave_days, late_minutes, overtime_hours, base_salary, total_earnings, total_deductions, bpjs_employee, bpjs_company, pph21, net_salary, ter_category, employee:employees(full_name, employee_no)")
      .eq("period_id", id)
      .order("created_at"),
    supabase
      .from("payroll_adjustments")
      .select("id, amount, note, employee:employees(full_name), component:salary_components(name, type)")
      .eq("period_id", id)
      .order("created_at"),
    getOptions(),
  ]);
  if (!period) notFound();

  const draft = period.status === "draft";
  const sum = (k: "total_earnings" | "bpjs_employee" | "bpjs_company" | "pph21" | "net_salary") =>
    (slips ?? []).reduce((s, x) => s + Number(x[k]), 0);
  const employees = options.employees.filter((e) => !period.branch_id || e.branch_id === period.branch_id);

  return (
    <>
      <PageHeader
        title={`Payroll ${monthYear(period.period_month)}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {period.branch?.name ?? "Semua cabang"} · absensi {date(period.start_date)} – {date(period.end_date)}
            <StatusBadge map={PAYROLL_STATUS} value={period.status} />
          </span>
        }
        back={{ href: "/payroll", label: "Penggajian" }}
        actions={
          <>
            {draft ? (
              <>
                <ActionButton action={generatePayroll.bind(null, id)} variant={slips?.length ? "outline" : "default"} size="default">
                  <Calculator /> {slips?.length ? "Hitung ulang" : "Hitung gaji"}
                </ActionButton>
                {slips?.length ? (
                  <ActionButton
                    action={setPeriodStatus.bind(null, id, "finalized")}
                    confirm="Finalisasi payroll? Slip akan terkunci dan bisa dilihat karyawan."
                    variant="default"
                    size="default"
                  >
                    <Lock /> Finalisasi
                  </ActionButton>
                ) : null}
                <ActionButton action={deletePeriod.bind(null, id)} confirm="Hapus periode draft ini?" variant="ghost" size="icon" title="Hapus periode">
                  <Trash2 />
                </ActionButton>
              </>
            ) : null}
            {period.status === "finalized" ? (
              <>
                <ActionButton action={setPeriodStatus.bind(null, id, "draft")} confirm="Buka kembali payroll ke draft?" size="default">
                  <RotateCcw /> Buka kembali
                </ActionButton>
                <ActionButton action={setPeriodStatus.bind(null, id, "paid")} confirm="Tandai gaji sudah ditransfer?" variant="default" size="default">
                  <Wallet /> Tandai dibayar
                </ActionButton>
              </>
            ) : null}
            {slips?.length ? (
              <a href={`/payroll/${id}/export`} className={buttonVariants({ variant: "outline" })}>
                <Download /> Excel
              </a>
            ) : null}
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total pendapatan", value: sum("total_earnings") },
          { label: "Total gaji bersih (transfer)", value: sum("net_salary") },
          { label: "PPh 21 dipotong", value: sum("pph21") },
          { label: "BPJS (karyawan + perusahaan)", value: sum("bpjs_employee") + sum("bpjs_company") },
        ].map((k) => (
          <Card key={k.label}>
            <CardHeader>
              <CardDescription>{k.label}</CardDescription>
              <CardTitle className="text-xl tabular-nums">{rupiah(k.value)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="grid gap-1">
            <CardTitle>Penyesuaian periode ini</CardTitle>
            <CardDescription>Bonus, insentif, kasbon, atau potongan lain yang hanya berlaku bulan ini.</CardDescription>
          </div>
          {draft ? (
            <FormDialog title="Tambah penyesuaian" action={addAdjustment.bind(null, id)} trigger={<Button size="sm"><Plus /> Tambah</Button>}>
              <FormField name="employee_id" label="Karyawan">
                <NativeSelect id="employee_id" name="employee_id" defaultValue="" className="w-full" required>
                  <NativeSelectOption value="" disabled>Pilih karyawan</NativeSelectOption>
                  {employees.map((e) => (
                    <NativeSelectOption key={e.id} value={e.id}>{e.full_name} ({e.employee_no})</NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField name="component_id" label="Komponen">
                <NativeSelect id="component_id" name="component_id" defaultValue="" className="w-full" required>
                  <NativeSelectOption value="" disabled>Pilih komponen</NativeSelectOption>
                  {options.components.filter((c) => !c.is_fixed && !["LEMBUR", "POT_TELAT", "POT_ALPA"].includes(c.code)).map((c) => (
                    <NativeSelectOption key={c.id} value={c.id}>{c.name} ({c.type === "earning" ? "+" : "−"})</NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField name="amount" label="Nominal (Rp)">
                <Input id="amount" name="amount" type="number" min="1" step="1000" required />
              </FormField>
              <FormField name="note" label="Keterangan">
                <Input id="note" name="note" placeholder="mis. Bonus target Q3" />
              </FormField>
            </FormDialog>
          ) : null}
        </CardHeader>
        {adjustments?.length ? (
          <CardContent className="px-0">
            <Table>
              <TableBody>
                {adjustments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="pl-4">{a.employee?.full_name}</TableCell>
                    <TableCell>
                      {a.component?.name}
                      {a.note ? <span className="text-muted-foreground"> · {a.note}</span> : null}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums ${a.component?.type === "deduction" ? "text-destructive" : ""}`}>
                      {a.component?.type === "deduction" ? "−" : "+"}{rupiah(a.amount)}
                    </TableCell>
                    <TableCell className="w-12 pr-4">
                      {draft ? (
                        <ActionButton action={removeAdjustment.bind(null, id, a.id)} variant="ghost" size="icon-sm" title="Hapus">
                          <Trash2 />
                        </ActionButton>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Slip gaji ({slips?.length ?? 0})</CardTitle>
          {draft && slips?.length ? (
            <CardDescription>Masih draft — data absensi/cuti yang berubah akan ikut jika dihitung ulang.</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Karyawan</TableHead>
                <TableHead className="text-right">Hadir</TableHead>
                <TableHead className="text-right">Alpa</TableHead>
                <TableHead className="text-right">Lembur</TableHead>
                <TableHead className="text-right">Pendapatan</TableHead>
                <TableHead className="text-right">BPJS</TableHead>
                <TableHead className="text-right">PPh 21</TableHead>
                <TableHead className="text-right">Potongan</TableHead>
                <TableHead className="pr-4 text-right">Gaji bersih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slips?.length ? (
                slips.map((s) => (
                  <TableRow key={s.id} className="relative">
                    <TableCell className="pl-4">
                      <Link href={`/slip-gaji/${s.id}`} className="font-medium after:absolute after:inset-0 hover:underline">
                        {s.employee?.full_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{s.employee?.employee_no} · TER {s.ter_category}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{s.present_days}/{s.working_days}</TableCell>
                    <TableCell className={`text-right tabular-nums ${s.absent_days ? "text-destructive" : ""}`}>{s.absent_days}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(s.overtime_hours) ? `${number(s.overtime_hours, 1)} j` : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{rupiah(s.total_earnings)}</TableCell>
                    <TableCell className="text-right tabular-nums">{rupiah(s.bpjs_employee)}</TableCell>
                    <TableCell className="text-right tabular-nums">{rupiah(s.pph21)}</TableCell>
                    <TableCell className="text-right tabular-nums">{rupiah(s.total_deductions)}</TableCell>
                    <TableCell className="pr-4 text-right font-semibold tabular-nums">{rupiah(s.net_salary)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    Klik “Hitung gaji” untuk membuat slip semua karyawan aktif.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {slips?.length ? (
              <TableFooter>
                <TableRow>
                  <TableCell className="pl-4" colSpan={4}>Total</TableCell>
                  <TableCell className="text-right tabular-nums">{rupiah(sum("total_earnings"))}</TableCell>
                  <TableCell className="text-right tabular-nums">{rupiah(sum("bpjs_employee"))}</TableCell>
                  <TableCell className="text-right tabular-nums">{rupiah(sum("pph21"))}</TableCell>
                  <TableCell />
                  <TableCell className="pr-4 text-right tabular-nums">{rupiah(sum("net_salary"))}</TableCell>
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </CardContent>
      </Card>
      {period.status === "paid" ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4" /> Dibayar pada {date(period.paid_at)}
        </p>
      ) : null}
    </>
  );
}
