import type { Metadata } from "next";
import { Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { isHR } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { REQUEST_STATUS, date, dateTime, number } from "@/lib/format";
import { DecisionButtons } from "./decision-dialog";

export const metadata: Metadata = { title: "Persetujuan" };

export default async function PersetujuanPage() {
  const user = await requireUser(["admin", "hr", "manager"]);
  const me = user.employee?.id ?? "00000000-0000-0000-0000-000000000000";
  const hr = isHR(user.role);
  const supabase = await createClient();

  // Antrian: tahap atasan (pending & saya atasannya / tanpa atasan untuk HR) + tahap HR
  const pendingFilter = hr
    ? `and(status.eq.pending,supervisor_id.eq.${me}),and(status.eq.pending,supervisor_id.is.null),status.eq.approved_supervisor`
    : `and(status.eq.pending,supervisor_id.eq.${me})`;

  // HR/Admin: pengajuan yang masih di tahap atasan lain (hanya dipantau, belum bisa diproses)
  const [{ data: leaves }, { data: overtimes }, { data: history }, { data: waitLeaves }, { data: waitOvertimes }] = await Promise.all([
    supabase
      .from("leave_requests")
      .select(
        "id, start_date, end_date, days, reason, status, supervisor_id, attachment_path, created_at, supervisor_note, leave_type:leave_types(name), employee:employees!leave_requests_employee_id_fkey(full_name, employee_no)",
      )
      .or(pendingFilter)
      .neq("employee_id", me)
      .order("created_at"),
    supabase
      .from("overtime_requests")
      .select("id, work_date, hours, reason, status, supervisor_id, created_at, employee:employees!overtime_requests_employee_id_fkey(full_name, employee_no)")
      .or(pendingFilter)
      .neq("employee_id", me)
      .order("created_at"),
    supabase
      .from("leave_requests")
      .select("id, start_date, end_date, days, status, updated_at, leave_type:leave_types(name), employee:employees!leave_requests_employee_id_fkey(full_name)")
      .in("status", ["approved", "rejected"])
      .neq("employee_id", me)
      .or(hr ? `supervisor_id.eq.${me},hr_id.eq.${me}` : `supervisor_id.eq.${me}`)
      .order("updated_at", { ascending: false })
      .limit(20),
    hr
      ? supabase
          .from("leave_requests")
          .select("id, start_date, end_date, days, created_at, leave_type:leave_types(name), employee:employees!leave_requests_employee_id_fkey(full_name), supervisor:employees!leave_requests_supervisor_id_fkey(full_name)")
          .eq("status", "pending")
          .not("supervisor_id", "is", null)
          .neq("supervisor_id", me)
          .order("created_at")
      : Promise.resolve({ data: [] as never[] }),
    hr
      ? supabase
          .from("overtime_requests")
          .select("id, work_date, hours, created_at, employee:employees!overtime_requests_employee_id_fkey(full_name), supervisor:employees!overtime_requests_supervisor_id_fkey(full_name)")
          .eq("status", "pending")
          .not("supervisor_id", "is", null)
          .neq("supervisor_id", me)
          .order("created_at")
      : Promise.resolve({ data: [] as never[] }),
  ]);

  // Lampiran ada di bucket privat; baris di atas sudah lolos RLS, jadi aman dibuatkan signed URL.
  const paths = (leaves ?? []).map((l) => l.attachment_path).filter((p): p is string => Boolean(p));
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await createAdminClient().storage.from("employee-documents").createSignedUrls(paths, 600);
    data?.forEach((d) => d.path && d.signedUrl && signed.set(d.path, d.signedUrl));
  }

  const stageOf = (status: string) => (status === "pending" ? "supervisor" : "hr");

  return (
    <>
      <PageHeader title="Persetujuan" description="Alur persetujuan: atasan langsung → HR." />
      <Tabs defaultValue="leave">
        <TabsList>
          <TabsTrigger value="leave">
            Cuti {leaves?.length ? <Badge variant="secondary">{leaves.length}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="overtime">
            Lembur {overtimes?.length ? <Badge variant="secondary">{overtimes.length}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="history">Riwayat</TabsTrigger>
        </TabsList>

        <TabsContent value="leave" className="grid gap-4">
          <Card>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Karyawan</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Hari</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead>Tahap</TableHead>
                    <TableHead className="pr-4" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves?.length ? (
                    leaves.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="pl-4">
                          <p className="font-medium">{l.employee?.full_name}</p>
                          <p className="text-xs text-muted-foreground">Diajukan {dateTime(l.created_at)}</p>
                        </TableCell>
                        <TableCell>{l.leave_type?.name}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {date(l.start_date)}
                          {l.end_date !== l.start_date ? ` – ${date(l.end_date)}` : ""}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{number(l.days, 1)}</TableCell>
                        <TableCell className="max-w-64">
                          <p className="truncate" title={l.reason}>{l.reason}</p>
                          {l.supervisor_note ? <p className="truncate text-xs text-muted-foreground">Atasan: {l.supervisor_note}</p> : null}
                          {l.attachment_path && signed.get(l.attachment_path) ? (
                            <a href={signed.get(l.attachment_path)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline">
                              <Paperclip className="size-3" /> Lampiran
                            </a>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <StatusBadge map={REQUEST_STATUS} value={l.status} />
                        </TableCell>
                        <TableCell className="pr-4">
                          <DecisionButtons
                            kind="leave"
                            id={l.id}
                            stage={stageOf(l.status)}
                            summary={`${l.employee?.full_name} — ${l.leave_type?.name}, ${number(l.days, 1)} hari`}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <EmptyRow colSpan={7} />
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {waitLeaves?.length ? (
            <WaitingList
              items={waitLeaves.map((l) => ({
                id: l.id,
                who: l.employee?.full_name ?? "",
                what: `${l.leave_type?.name} · ${date(l.start_date)}${l.end_date !== l.start_date ? ` – ${date(l.end_date)}` : ""} (${number(l.days, 1)} hari)`,
                supervisor: l.supervisor?.full_name ?? "—",
                since: l.created_at,
              }))}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="overtime" className="grid gap-4">
          <Card>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Karyawan</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Jam</TableHead>
                    <TableHead>Pekerjaan</TableHead>
                    <TableHead>Tahap</TableHead>
                    <TableHead className="pr-4" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overtimes?.length ? (
                    overtimes.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="pl-4 font-medium">{o.employee?.full_name}</TableCell>
                        <TableCell className="whitespace-nowrap">{date(o.work_date)}</TableCell>
                        <TableCell className="text-right tabular-nums">{number(o.hours, 1)}</TableCell>
                        <TableCell className="max-w-72 truncate" title={o.reason}>{o.reason}</TableCell>
                        <TableCell>
                          <StatusBadge map={REQUEST_STATUS} value={o.status} />
                        </TableCell>
                        <TableCell className="pr-4">
                          <DecisionButtons
                            kind="overtime"
                            id={o.id}
                            stage={stageOf(o.status)}
                            summary={`${o.employee?.full_name} — lembur ${number(o.hours, 1)} jam, ${date(o.work_date)}`}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <EmptyRow colSpan={6} />
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {waitOvertimes?.length ? (
            <WaitingList
              items={waitOvertimes.map((o) => ({
                id: o.id,
                who: o.employee?.full_name ?? "",
                what: `Lembur ${number(o.hours, 1)} jam · ${date(o.work_date)}`,
                supervisor: o.supervisor?.full_name ?? "—",
                since: o.created_at,
              }))}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Karyawan</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-4">Diproses</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history?.length ? (
                    history.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="pl-4">{h.employee?.full_name}</TableCell>
                        <TableCell>{h.leave_type?.name}</TableCell>
                        <TableCell className="whitespace-nowrap">{date(h.start_date)} – {date(h.end_date)}</TableCell>
                        <TableCell>
                          <StatusBadge map={REQUEST_STATUS} value={h.status} />
                        </TableCell>
                        <TableCell className="pr-4 text-muted-foreground">{dateTime(h.updated_at)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <EmptyRow colSpan={5} text="Belum ada riwayat." />
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function EmptyRow({ colSpan, text = "Tidak ada pengajuan yang menunggu Anda." }: { colSpan: number; text?: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center text-muted-foreground">
        {text}
      </TableCell>
    </TableRow>
  );
}

/** Pengajuan yang masih menunggu atasan lain — HR hanya memantau, belum bisa memproses. */
function WaitingList({ items }: { items: { id: string; who: string; what: string; supervisor: string; since: string }[] }) {
  return (
    <Card className="bg-muted/40">
      <CardHeader>
        <CardTitle className="text-sm">Masih di tahap atasan ({items.length})</CardTitle>
        <CardDescription>Bisa diproses HR setelah atasan langsung menyetujui. Hubungi atasan bila sudah terlalu lama.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableBody>
            {items.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="pl-4 font-medium">{i.who}</TableCell>
                <TableCell>{i.what}</TableCell>
                <TableCell className="text-muted-foreground">Menunggu: {i.supervisor}</TableCell>
                <TableCell className="pr-4 text-right text-muted-foreground">Diajukan {dateTime(i.since)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
