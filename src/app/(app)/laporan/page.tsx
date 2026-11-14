import type { Metadata } from "next";
import { Download } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { getOptions, param } from "@/lib/queries";
import { date, minutesToText, monthYear, number, rupiah, todayISO } from "@/lib/format";
import { attendanceReport, leaveReport, payrollReport, type ReportFilter } from "./data";

export const metadata: Metadata = { title: "Laporan" };

export default async function LaporanPage({ searchParams }: PageProps<"/laporan">) {
  await requireUser(["admin", "hr"]);
  const sp = await searchParams;
  const today = todayISO();
  const f: ReportFilter = {
    start: param(sp.start) ?? `${today.slice(0, 7)}-01`,
    end: param(sp.end) ?? today,
    branch: param(sp.branch),
    year: Number(param(sp.year) ?? today.slice(0, 4)),
  };
  const tab = param(sp.tab) ?? "absensi";

  const [options, attendance, leave, payroll] = await Promise.all([getOptions(), attendanceReport(f), leaveReport(f), payrollReport(f)]);
  const qs = (type: string) => {
    const s = new URLSearchParams({ type, start: f.start, end: f.end, year: String(f.year) });
    if (f.branch) s.set("branch", f.branch);
    return `/laporan/export?${s}`;
  };
  const sumA = (k: "present" | "late" | "late_minutes" | "leave" | "sick" | "absent") => attendance.reduce((s, r) => s + Number(r[k]), 0);
  const sumP = (k: "earnings" | "bpjsE" | "bpjsC" | "pph" | "net") => payroll.reduce((s, r) => s + r[k], 0);
  const years = Array.from({ length: 4 }, (_, i) => Number(today.slice(0, 4)) - i);

  return (
    <>
      <PageHeader title="Laporan" description="Rekap absensi, cuti, dan penggajian — bisa diunduh ke Excel." />

      <form className="mb-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="tab" value={tab} />
        <label className="grid gap-1 text-xs text-muted-foreground">
          Dari
          <Input type="date" name="start" defaultValue={f.start} className="h-9 w-auto" />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Sampai
          <Input type="date" name="end" defaultValue={f.end} className="h-9 w-auto" />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Tahun (cuti & gaji)
          <NativeSelect name="year" defaultValue={String(f.year)}>
            {years.map((y) => <NativeSelectOption key={y} value={y}>{y}</NativeSelectOption>)}
          </NativeSelect>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Cabang
          <NativeSelect name="branch" defaultValue={f.branch ?? ""} className="min-w-40">
            <NativeSelectOption value="">Semua cabang</NativeSelectOption>
            {options.branches.map((b) => <NativeSelectOption key={b.id} value={b.id}>{b.name}</NativeSelectOption>)}
          </NativeSelect>
        </label>
        <Button type="submit" variant="secondary">Terapkan</Button>
      </form>

      <Tabs defaultValue={tab}>
        <TabsList className="mb-2">
          <TabsTrigger value="absensi">Absensi</TabsTrigger>
          <TabsTrigger value="cuti">Cuti</TabsTrigger>
          <TabsTrigger value="gaji">Penggajian</TabsTrigger>
        </TabsList>

        <TabsContent value="absensi">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="grid gap-1">
                <CardTitle>Rekap absensi</CardTitle>
                <CardDescription>{date(f.start)} – {date(f.end)} · {attendance.length} karyawan</CardDescription>
              </div>
              <a href={qs("attendance")} className={buttonVariants({ variant: "outline", size: "sm" })}><Download /> Excel</a>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Karyawan</TableHead>
                    <TableHead>Cabang</TableHead>
                    <TableHead className="text-right">Hari kerja</TableHead>
                    <TableHead className="text-right">Hadir</TableHead>
                    <TableHead className="text-right">Telat</TableHead>
                    <TableHead className="text-right">Total telat</TableHead>
                    <TableHead className="text-right">Cuti</TableHead>
                    <TableHead className="text-right">Sakit</TableHead>
                    <TableHead className="pr-4 text-right">Alpa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((r) => (
                    <TableRow key={r.employee_id}>
                      <TableCell className="pl-4">
                        <p className="font-medium">{r.full_name}</p>
                        <p className="text-xs text-muted-foreground">{r.employee_no} · {r.department_name ?? "—"}</p>
                      </TableCell>
                      <TableCell>{r.branch_name}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.working_days}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.present}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.late}</TableCell>
                      <TableCell className="text-right tabular-nums">{minutesToText(r.late_minutes)}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.leave}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.sick}</TableCell>
                      <TableCell className={`pr-4 text-right tabular-nums ${r.absent ? "font-medium text-destructive" : ""}`}>{r.absent}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="pl-4" colSpan={3}>Total</TableCell>
                    <TableCell className="text-right tabular-nums">{sumA("present")}</TableCell>
                    <TableCell className="text-right tabular-nums">{sumA("late")}</TableCell>
                    <TableCell className="text-right tabular-nums">{minutesToText(sumA("late_minutes"))}</TableCell>
                    <TableCell className="text-right tabular-nums">{sumA("leave")}</TableCell>
                    <TableCell className="text-right tabular-nums">{sumA("sick")}</TableCell>
                    <TableCell className="pr-4 text-right tabular-nums">{sumA("absent")}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cuti">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="grid gap-1">
                <CardTitle>Rekap cuti disetujui {f.year}</CardTitle>
                <CardDescription>Jumlah hari kerja per jenis cuti.</CardDescription>
              </div>
              <a href={qs("leave")} className={buttonVariants({ variant: "outline", size: "sm" })}><Download /> Excel</a>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Karyawan</TableHead>
                    {leave.types.map((t) => <TableHead key={t} className="text-right">{t}</TableHead>)}
                    <TableHead className="pr-4 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leave.rows.length ? (
                    leave.rows.map((r) => (
                      <TableRow key={r.no}>
                        <TableCell className="pl-4">{r.name} <span className="text-xs text-muted-foreground">{r.no}</span></TableCell>
                        {leave.types.map((t) => <TableCell key={t} className="text-right tabular-nums">{r.byType[t] ? number(r.byType[t], 1) : "—"}</TableCell>)}
                        <TableCell className="pr-4 text-right font-medium tabular-nums">{number(r.total, 1)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={leave.types.length + 2} className="py-10 text-center text-muted-foreground">Belum ada cuti disetujui pada tahun ini.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gaji">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="grid gap-1">
                <CardTitle>Rekap penggajian {f.year}</CardTitle>
                <CardDescription>Hanya periode yang sudah final/dibayar.</CardDescription>
              </div>
              <a href={qs("payroll")} className={buttonVariants({ variant: "outline", size: "sm" })}><Download /> Excel</a>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Bulan</TableHead>
                    <TableHead className="text-right">Karyawan</TableHead>
                    <TableHead className="text-right">Pendapatan</TableHead>
                    <TableHead className="text-right">BPJS karyawan</TableHead>
                    <TableHead className="text-right">BPJS perusahaan</TableHead>
                    <TableHead className="text-right">PPh 21</TableHead>
                    <TableHead className="pr-4 text-right">Gaji bersih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payroll.length ? (
                    payroll.map((r) => (
                      <TableRow key={r.month}>
                        <TableCell className="pl-4 capitalize">{monthYear(r.month)}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                        <TableCell className="text-right tabular-nums">{rupiah(r.earnings)}</TableCell>
                        <TableCell className="text-right tabular-nums">{rupiah(r.bpjsE)}</TableCell>
                        <TableCell className="text-right tabular-nums">{rupiah(r.bpjsC)}</TableCell>
                        <TableCell className="text-right tabular-nums">{rupiah(r.pph)}</TableCell>
                        <TableCell className="pr-4 text-right font-medium tabular-nums">{rupiah(r.net)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Belum ada payroll final pada tahun ini.</TableCell></TableRow>
                  )}
                </TableBody>
                {payroll.length ? (
                  <TableFooter>
                    <TableRow>
                      <TableCell className="pl-4" colSpan={2}>Total</TableCell>
                      <TableCell className="text-right tabular-nums">{rupiah(sumP("earnings"))}</TableCell>
                      <TableCell className="text-right tabular-nums">{rupiah(sumP("bpjsE"))}</TableCell>
                      <TableCell className="text-right tabular-nums">{rupiah(sumP("bpjsC"))}</TableCell>
                      <TableCell className="text-right tabular-nums">{rupiah(sumP("pph"))}</TableCell>
                      <TableCell className="pr-4 text-right tabular-nums">{rupiah(sumP("net"))}</TableCell>
                    </TableRow>
                  </TableFooter>
                ) : null}
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
