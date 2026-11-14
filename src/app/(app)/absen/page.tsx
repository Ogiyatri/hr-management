import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ATTENDANCE_STATUS, date, minutesToText, time, todayISO } from "@/lib/format";
import { ClockCard } from "./clock-card";

export const metadata: Metadata = { title: "Absen" };

export default async function AbsenPage() {
  const user = await requireUser();
  if (!user.employee) {
    return (
      <>
        <PageHeader title="Absen" />
        <EmptyState title="Akun ini tidak terhubung ke data karyawan" description="Absensi hanya untuk akun karyawan." />
      </>
    );
  }

  const supabase = await createClient();
  const { data: emp } = await supabase
    .from("employees")
    .select("branch:branches(name, latitude, longitude, radius_m, timezone), shift:shifts(name, start_time, end_time)")
    .eq("id", user.employee.id)
    .single();

  const tz = emp?.branch?.timezone ?? "Asia/Jakarta";
  const today = todayISO(tz);
  const { data: history } = await supabase
    .from("attendances")
    .select("id, work_date, status, check_in_at, check_out_at, late_minutes, check_in_distance_m, note")
    .eq("employee_id", user.employee.id)
    .order("work_date", { ascending: false })
    .limit(31);

  const todayRow = history?.find((h) => h.work_date === today);

  return (
    <>
      <PageHeader title="Absen" description="Absen masuk & pulang dengan lokasi dan selfie." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        {emp?.branch ? (
          <ClockCard
            userId={user.id}
            branch={emp.branch}
            shift={emp.shift}
            checkInAt={todayRow?.check_in_at ?? null}
            checkOutAt={todayRow?.check_out_at ?? null}
            todayStatus={todayRow?.status ?? null}
          />
        ) : (
          <EmptyState title="Cabang belum diatur" description="Hubungi HR untuk mengatur cabang Anda." />
        )}

        <Card>
          <CardHeader>
            <CardTitle>Riwayat 31 hari terakhir</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Masuk</TableHead>
                  <TableHead>Pulang</TableHead>
                  <TableHead className="pr-4 text-right">Telat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history?.length ? (
                  history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="pl-4">{date(h.work_date)}</TableCell>
                      <TableCell>
                        <StatusBadge map={ATTENDANCE_STATUS} value={h.status} />
                      </TableCell>
                      <TableCell className="tabular-nums">{time(h.check_in_at, tz)}</TableCell>
                      <TableCell className="tabular-nums">{time(h.check_out_at, tz)}</TableCell>
                      <TableCell className="pr-4 text-right tabular-nums">{minutesToText(h.late_minutes)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Belum ada riwayat absensi.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
