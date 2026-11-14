import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Briefcase, CalendarDays, CheckCheck, Clock, UserX, Users, Wallet } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { ROLE_LABEL, requireUser, type CurrentUser } from "@/lib/auth";
import { isApprover } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { ATTENDANCE_STATUS, longDate, monthYear, number, rupiah, time, todayISO } from "@/lib/format";
import { AttendanceTrend, DepartmentBars, PayrollBars } from "./charts";

export const metadata: Metadata = { title: "Dashboard" };

type Summary = {
  total_employees: number;
  present_today: number;
  late_today: number;
  leave_today: number;
  pending_leave: number;
  pending_overtime: number;
  open_jobs: number;
  trend: { day: string; present: number; late: number; leave: number }[];
  by_department: { name: string; count: number }[];
  payroll: { month: string; net: number; gross: number; count: number }[];
};

function Kpi({ label, value, icon: Icon, hint, href }: { label: string; value: string | number; icon: React.ElementType; hint?: string; href?: string }) {
  const body = (
    <Card className={href ? "transition-colors hover:bg-muted/50" : ""}>
      <CardHeader>
        <CardDescription className="flex items-center justify-between">
          {label} <Icon className="size-4" />
        </CardDescription>
        <CardTitle className="text-3xl font-semibold tabular-nums">{value}</CardTitle>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardHeader>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const firstName = (user.employee?.fullName ?? user.email).split(" ")[0];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Halo, {firstName}</h1>
        <p className="text-sm text-muted-foreground">
          {longDate(todayISO())} · {ROLE_LABEL[user.role]}
          {user.employee ? ` · ${user.employee.employeeNo}` : ""}
        </p>
      </div>
      {user.employee ? <MyToday user={user} /> : null}
      {isApprover(user.role) ? <TeamOverview user={user} /> : null}
    </div>
  );
}

/** Ringkasan pribadi: absen hari ini, sisa cuti, slip terakhir. */
async function MyToday({ user }: { user: CurrentUser }) {
  const supabase = await createClient();
  const empId = user.employee!.id;
  const today = todayISO();
  const [{ data: att }, { data: balances }, { data: annual }, { data: slip }, { count: myPending }] = await Promise.all([
    supabase.from("attendances").select("status, check_in_at, check_out_at").eq("employee_id", empId).eq("work_date", today).maybeSingle(),
    supabase.from("leave_balances").select("quota, used, leave_type:leave_types!inner(code)").eq("employee_id", empId).eq("year", new Date().getFullYear()).eq("leave_type.code", "ANNUAL").maybeSingle(),
    supabase.from("leave_types").select("default_quota").eq("code", "ANNUAL").maybeSingle(),
    supabase
      .from("payslips")
      .select("id, net_salary, period:payroll_periods!inner(period_month, status)")
      .eq("employee_id", empId)
      .in("period.status", ["finalized", "paid"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("employee_id", empId).in("status", ["pending", "approved_supervisor"]),
  ]);
  const quota = Number(balances?.quota ?? annual?.default_quota ?? 0);
  const remaining = quota - Number(balances?.used ?? 0);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardDescription className="flex items-center justify-between">Absensi hari ini <Clock className="size-4" /></CardDescription>
          <CardTitle className="flex items-center gap-2">
            {att ? <StatusBadge map={ATTENDANCE_STATUS} value={att.status} /> : <span className="text-muted-foreground">Belum absen</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between gap-2">
          <p className="text-sm text-muted-foreground tabular-nums">
            Masuk {time(att?.check_in_at)} · Pulang {time(att?.check_out_at)}
          </p>
          {!att?.check_out_at && (!att || ["present", "late"].includes(att.status)) ? (
            <Link href="/absen" className={buttonVariants({ size: "sm" })}>
              {att?.check_in_at ? "Absen pulang" : "Absen masuk"}
            </Link>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription className="flex items-center justify-between">Sisa cuti tahunan <CalendarDays className="size-4" /></CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {number(remaining, 1)} <span className="text-sm font-normal text-muted-foreground">/ {number(quota)} hari</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/cuti" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            {myPending ? `${myPending} pengajuan diproses` : "Ajukan cuti"} <ArrowRight className="size-3" />
          </Link>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription className="flex items-center justify-between">Slip gaji terakhir <Wallet className="size-4" /></CardDescription>
          <CardTitle className="text-3xl tabular-nums">{slip ? rupiah(slip.net_salary) : "—"}</CardTitle>
        </CardHeader>
        <CardContent>
          {slip ? (
            <Link href={`/slip-gaji/${slip.id}`} className="inline-flex items-center gap-1 text-sm capitalize text-primary hover:underline">
              {monthYear(slip.period?.period_month)} <ArrowRight className="size-3" />
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada slip final.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Ringkasan tim (manager) / perusahaan (HR) — cakupan data mengikuti RLS. */
async function TeamOverview({ user }: { user: CurrentUser }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("dashboard_summary", { p_branch_id: user.role === "hr" && user.branchId ? user.branchId : undefined });
  const s = data as unknown as Summary | null;
  if (!s) return null;
  const hr = user.role === "admin" || user.role === "hr";
  const pending = s.pending_leave + s.pending_overtime;
  // Yang bisa diproses user ini (sama dengan antrian di halaman Persetujuan)
  const me = user.employee?.id ?? "00000000-0000-0000-0000-000000000000";
  const queue = hr
    ? `and(status.eq.pending,supervisor_id.eq.${me}),and(status.eq.pending,supervisor_id.is.null),status.eq.approved_supervisor`
    : `and(status.eq.pending,supervisor_id.eq.${me})`;
  const [{ count: myLeave }, { count: myOvertime }] = await Promise.all([
    supabase.from("leave_requests").select("id", { count: "exact", head: true }).or(queue).neq("employee_id", me),
    supabase.from("overtime_requests").select("id", { count: "exact", head: true }).or(queue).neq("employee_id", me),
  ]);
  const mine = (myLeave ?? 0) + (myOvertime ?? 0);
  const atSupervisor = Math.max(pending - mine, 0);
  const today = todayISO();
  const [{ data: holiday }] = await Promise.all([
    supabase.from("holidays").select("name").eq("date", today).limit(1).maybeSingle(),
  ]);
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  const offDay = holiday?.name ?? (dow === 0 || dow === 6 ? "Akhir pekan" : null);
  const notYet = Math.max(s.total_employees - s.present_today - s.leave_today, 0);
  const trendTotals = s.trend.reduce(
    (a, d) => ({ present: a.present + d.present, late: a.late + d.late, leave: a.leave + d.leave }),
    { present: 0, late: 0, leave: 0 },
  );

  return (
    <>
      <h2 className="-mb-2 text-lg font-semibold">{hr ? "Ringkasan perusahaan" : "Ringkasan tim"}</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label={hr ? "Karyawan aktif" : "Anggota tim"} value={s.total_employees} icon={Users} href={hr ? "/karyawan" : undefined} />
        <Kpi label="Hadir hari ini" value={s.present_today} icon={Clock} hint={`${s.late_today} terlambat`} href={hr ? "/absensi" : undefined} />
        <Kpi
          label="Belum absen"
          value={offDay ? "—" : notYet}
          icon={UserX}
          hint={offDay ? `Hari libur: ${offDay}` : `${s.leave_today} cuti/sakit`}
          href={hr ? "/absensi" : undefined}
        />
        <Kpi
          label="Menunggu persetujuan Anda"
          value={mine}
          icon={CheckCheck}
          hint={atSupervisor ? `+${atSupervisor} masih di tahap atasan` : `${myLeave ?? 0} cuti · ${myOvertime ?? 0} lembur`}
          href="/persetujuan"
        />
        {hr ? <Kpi label="Lowongan dibuka" value={s.open_jobs} icon={Briefcase} href="/rekrutmen" /> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Kehadiran 14 hari terakhir</CardTitle>
            <CardDescription>
              Total: {trendTotals.present - trendTotals.late} tepat waktu · {trendTotals.late} terlambat · {trendTotals.leave} cuti/sakit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AttendanceTrend data={s.trend} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Karyawan per departemen</CardTitle>
          </CardHeader>
          <CardContent>
            <DepartmentBars data={s.by_department} />
          </CardContent>
        </Card>
      </div>

      {hr && s.payroll.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Total gaji bersih per bulan</CardTitle>
            <CardDescription>
              Terakhir: {monthYear(s.payroll[s.payroll.length - 1].month)} — {rupiah(s.payroll[s.payroll.length - 1].net)} untuk{" "}
              {s.payroll[s.payroll.length - 1].count} karyawan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PayrollBars data={s.payroll} />
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
