import type { Metadata } from "next";
import { Camera, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormDialog } from "@/components/form-dialog";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOptions, param } from "@/lib/queries";
import { ATTENDANCE_STATUS, longDate, minutesToText, time, todayISO } from "@/lib/format";
import { saveAttendance } from "./actions";
import { AttendanceFields } from "./attendance-fields";

export const metadata: Metadata = { title: "Data Absensi" };

const hhmm = (iso: string | null, tz: string) =>
  iso ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz, hourCycle: "h23" }).format(new Date(iso)) : undefined;

export default async function AbsensiPage({ searchParams }: PageProps<"/absensi">) {
  await requireUser(["admin", "hr"]);
  const sp = await searchParams;
  const day = param(sp.date) ?? todayISO();
  const branch = param(sp.branch);
  const supabase = await createClient();
  const options = await getOptions();

  let q = supabase
    .from("attendances")
    .select(
      "id, employee_id, status, check_in_at, check_out_at, late_minutes, check_in_distance_m, check_out_distance_m, check_in_photo_path, check_out_photo_path, note, employee:employees(full_name, employee_no), branch:branches(name, timezone)",
    )
    .eq("work_date", day)
    .order("check_in_at", { ascending: true, nullsFirst: false });
  if (branch) q = q.eq("branch_id", branch);
  const { data: rows } = await q;

  const activeEmps = options.employees.filter((e) => !branch || e.branch_id === branch);
  const done = new Set((rows ?? []).map((r) => r.employee_id));
  const missing = activeEmps.filter((e) => !done.has(e.id));
  const isWeekend = [0, 6].includes(new Date(`${day}T00:00:00`).getDay());

  // Foto selfie ada di bucket privat; HR punya akses baca (storage policy)
  const photoPaths = (rows ?? []).flatMap((r) => [r.check_in_photo_path, r.check_out_photo_path]).filter((p): p is string => Boolean(p));
  const signed = new Map<string, string>();
  if (photoPaths.length) {
    const { data } = await supabase.storage.from("attendance-photos").createSignedUrls(photoPaths, 600);
    data?.forEach((d) => d.path && d.signedUrl && signed.set(d.path, d.signedUrl));
  }
  const count = (s: string[]) => (rows ?? []).filter((r) => s.includes(r.status)).length;

  return (
    <>
      <PageHeader
        title="Data Absensi"
        description={longDate(day)}
        actions={
          <FormDialog
            title="Input absensi manual"
            action={saveAttendance}
            trigger={<Button><Plus /> Input manual</Button>}
          >
            <AttendanceFields employees={activeEmps} workDate={day} />
          </FormDialog>
        }
      />

      <form className="mb-4 flex flex-wrap gap-2">
        <Input type="date" name="date" defaultValue={day} className="h-9 w-auto" />
        <NativeSelect name="branch" defaultValue={branch ?? ""} className="min-w-40">
          <NativeSelectOption value="">Semua cabang</NativeSelectOption>
          {options.branches.map((b) => (
            <NativeSelectOption key={b.id} value={b.id}>{b.name}</NativeSelectOption>
          ))}
        </NativeSelect>
        <Button type="submit" variant="secondary">Tampilkan</Button>
      </form>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Hadir", value: count(["present", "late"]) },
          { label: "Terlambat", value: count(["late"]) },
          { label: "Cuti / sakit", value: count(["leave", "sick"]) },
          { label: "Belum absen", value: isWeekend ? 0 : missing.length },
        ].map((k) => (
          <Card key={k.label}>
            <CardHeader>
              <CardDescription>{k.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{k.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Karyawan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Masuk</TableHead>
                <TableHead>Pulang</TableHead>
                <TableHead className="text-right">Telat</TableHead>
                <TableHead>Selfie</TableHead>
                <TableHead className="pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows?.length ? (
                rows.map((r) => {
                  const tz = r.branch?.timezone ?? "Asia/Jakarta";
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="pl-4">
                        <p className="font-medium">{r.employee?.full_name}</p>
                        <p className="max-w-56 truncate text-xs text-muted-foreground" title={r.note ?? undefined}>
                          {r.branch?.name}{r.note ? ` · ${r.note}` : ""}
                        </p>
                      </TableCell>
                      <TableCell><StatusBadge map={ATTENDANCE_STATUS} value={r.status} /></TableCell>
                      <TableCell className="tabular-nums">
                        {time(r.check_in_at, tz)}
                        {r.check_in_distance_m !== null ? <p className="text-xs text-muted-foreground">{Math.round(r.check_in_distance_m)} m</p> : null}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {time(r.check_out_at, tz)}
                        {r.check_out_distance_m !== null ? <p className="text-xs text-muted-foreground">{Math.round(r.check_out_distance_m)} m</p> : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{minutesToText(r.late_minutes)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {[r.check_in_photo_path, r.check_out_photo_path].map((p, i) =>
                            p && signed.get(p) ? (
                              <a key={i} href={signed.get(p)} target="_blank" rel="noreferrer" title={i === 0 ? "Selfie masuk" : "Selfie pulang"}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={signed.get(p)} alt="" className="size-9 rounded-md object-cover" />
                              </a>
                            ) : null,
                          )}
                          {!r.check_in_photo_path && !r.check_out_photo_path ? <Camera className="size-4 text-muted-foreground/50" /> : null}
                        </div>
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <FormDialog
                          title={`Koreksi absensi — ${r.employee?.full_name}`}
                          action={saveAttendance}
                          trigger={<Button variant="ghost" size="icon-sm" title="Koreksi"><Pencil /></Button>}
                        >
                          <AttendanceFields
                            employeeId={r.employee_id}
                            workDate={day}
                            status={r.status}
                            checkIn={hhmm(r.check_in_at, tz)}
                            checkOut={hhmm(r.check_out_at, tz)}
                            lateMinutes={r.late_minutes}
                          />
                        </FormDialog>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Belum ada data absensi pada tanggal ini.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {missing.length && !isWeekend ? (
        <Card>
          <CardHeader>
            <CardTitle>Belum absen ({missing.length})</CardTitle>
            <CardDescription>Karyawan aktif tanpa catatan absensi pada tanggal ini.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {missing.map((e) => (
              <FormDialog
                key={e.id}
                title={`Input absensi — ${e.full_name}`}
                action={saveAttendance}
                trigger={<Button variant="outline" size="sm">{e.full_name}</Button>}
              >
                <AttendanceFields employeeId={e.id} workDate={day} status="absent" />
              </FormDialog>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
