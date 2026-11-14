import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormDialog } from "@/components/form-dialog";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOptions } from "@/lib/queries";
import { PAYROLL_STATUS, date, monthYear, rupiah } from "@/lib/format";
import { createPeriod } from "./actions";
import { PeriodFields } from "./period-fields";

export const metadata: Metadata = { title: "Penggajian" };

export default async function PayrollPage() {
  await requireUser(["admin", "hr"]);
  const supabase = await createClient();
  const [options, { data: periods }] = await Promise.all([
    getOptions(),
    supabase
      .from("payroll_periods")
      .select("id, period_month, start_date, end_date, status, branch:branches(name), payslips(net_salary)")
      .order("period_month", { ascending: false })
      .limit(36),
  ]);

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <>
      <PageHeader
        title="Penggajian"
        description="Gaji dihitung otomatis dari absensi, cuti, lembur, tunjangan, BPJS, dan PPh 21."
        actions={
          <FormDialog
            title="Buat periode payroll"
            action={createPeriod}
            submitLabel="Buat periode"
            trigger={
              <Button>
                <Plus /> Periode baru
              </Button>
            }
          >
            <PeriodFields branches={options.branches} defaultMonth={defaultMonth} />
          </FormDialog>
        }
      />
      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Periode</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead>Absensi</TableHead>
                <TableHead className="text-right">Karyawan</TableHead>
                <TableHead className="text-right">Total gaji bersih</TableHead>
                <TableHead className="pr-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods?.length ? (
                periods.map((p) => (
                  <TableRow key={p.id} className="relative">
                    <TableCell className="pl-4 font-medium">
                      <Link href={`/payroll/${p.id}`} className="capitalize after:absolute after:inset-0 hover:underline">
                        {monthYear(p.period_month)}
                      </Link>
                    </TableCell>
                    <TableCell>{p.branch?.name ?? "Semua cabang"}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{date(p.start_date)} – {date(p.end_date)}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.payslips.length}</TableCell>
                    <TableCell className="text-right tabular-nums">{rupiah(p.payslips.reduce((s, x) => s + Number(x.net_salary), 0))}</TableCell>
                    <TableCell className="pr-4">
                      <StatusBadge map={PAYROLL_STATUS} value={p.status} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Belum ada periode payroll. Klik “Periode baru” untuk mulai.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
