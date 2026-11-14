import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PAYROLL_STATUS, monthYear, rupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Slip Gaji" };

export default async function SlipGajiPage() {
  const user = await requireUser();
  if (!user.employee) {
    return (
      <>
        <PageHeader title="Slip Gaji" />
        <EmptyState title="Akun ini tidak terhubung ke data karyawan" />
      </>
    );
  }
  const supabase = await createClient();
  // RLS: karyawan hanya melihat slip miliknya pada periode final/dibayar
  const { data: slips } = await supabase
    .from("payslips")
    .select("id, net_salary, total_earnings, period:payroll_periods!inner(period_month, status)")
    .eq("employee_id", user.employee.id)
    .in("period.status", ["finalized", "paid"])
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Slip Gaji" description="Slip muncul setelah HR memfinalisasi payroll." />
      {slips?.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {slips.map((s) => (
            <Link key={s.id} href={`/slip-gaji/${s.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between gap-3">
                  <div className="grid gap-1">
                    <p className="font-medium capitalize">{monthYear(s.period?.period_month)}</p>
                    <p className="text-xl font-semibold tabular-nums">{rupiah(s.net_salary)}</p>
                    <StatusBadge map={PAYROLL_STATUS} value={s.period?.status} className="w-fit" />
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="Belum ada slip gaji" description="Slip gaji akan tampil di sini setelah payroll difinalisasi HR." />
      )}
    </>
  );
}
