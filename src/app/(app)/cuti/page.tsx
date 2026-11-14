import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/action-form";
import { ActionButton, FormDialog } from "@/components/form-dialog";
import { EmptyState, PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { REQUEST_STATUS, date, number } from "@/lib/format";
import { cancelLeave, createLeave } from "./actions";

export const metadata: Metadata = { title: "Cuti" };

export default async function CutiPage() {
  const user = await requireUser();
  if (!user.employee) {
    return (
      <>
        <PageHeader title="Cuti" />
        <EmptyState title="Akun ini tidak terhubung ke data karyawan" />
      </>
    );
  }

  const supabase = await createClient();
  const year = new Date().getFullYear();
  const [{ data: types }, { data: balances }, { data: requests }] = await Promise.all([
    supabase.from("leave_types").select("id, name, default_quota, requires_attachment, is_paid").order("name"),
    supabase.from("leave_balances").select("leave_type_id, quota, used").eq("employee_id", user.employee.id).eq("year", year),
    supabase
      .from("leave_requests")
      .select("id, start_date, end_date, days, reason, status, supervisor_note, hr_note, created_at, leave_type:leave_types(name)")
      .eq("employee_id", user.employee.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const quotaTypes = (types ?? []).filter((t) => t.default_quota !== null);

  return (
    <>
      <PageHeader
        title="Cuti"
        description="Ajukan cuti, pantau persetujuan atasan & HR, dan lihat sisa kuota."
        actions={
          <FormDialog
            title="Ajukan cuti"
            description="Hari libur & akhir pekan tidak dihitung."
            action={createLeave}
            submitLabel="Kirim pengajuan"
            trigger={
              <Button>
                <Plus /> Ajukan cuti
              </Button>
            }
          >
            <FormField name="leave_type_id" label="Jenis cuti">
              <NativeSelect id="leave_type_id" name="leave_type_id" className="w-full" required defaultValue="">
                <NativeSelectOption value="" disabled>
                  Pilih jenis cuti
                </NativeSelectOption>
                {types?.map((t) => (
                  <NativeSelectOption key={t.id} value={t.id}>
                    {t.name}
                    {t.requires_attachment ? " (wajib lampiran)" : ""}
                    {!t.is_paid ? " — tidak dibayar" : ""}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField name="start_date" label="Mulai">
                <Input id="start_date" name="start_date" type="date" required />
              </FormField>
              <FormField name="end_date" label="Selesai">
                <Input id="end_date" name="end_date" type="date" required />
              </FormField>
            </div>
            <FormField name="reason" label="Alasan">
              <Textarea id="reason" name="reason" rows={3} required />
            </FormField>
            <FormField name="attachment" label="Lampiran (opsional)" hint="Surat dokter, dll. Gambar/PDF maks. 4 MB.">
              <Input id="attachment" name="attachment" type="file" accept="image/*,application/pdf" />
            </FormField>
          </FormDialog>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quotaTypes.map((t) => {
          const b = balances?.find((x) => x.leave_type_id === t.id);
          const quota = Number(b?.quota ?? t.default_quota);
          const used = Number(b?.used ?? 0);
          return (
            <Card key={t.id}>
              <CardHeader>
                <CardDescription>{t.name}</CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {number(quota - used, 1)} <span className="text-sm font-normal text-muted-foreground">/ {number(quota, 1)} hari</span>
                </CardTitle>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat pengajuan</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Jenis</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Hari</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests?.length ? (
                requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="pl-4 font-medium">{r.leave_type?.name}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {date(r.start_date)}
                      {r.end_date !== r.start_date ? ` – ${date(r.end_date)}` : ""}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{number(r.days, 1)}</TableCell>
                    <TableCell>
                      <StatusBadge map={REQUEST_STATUS} value={r.status} />
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-muted-foreground" title={r.hr_note ?? r.supervisor_note ?? r.reason}>
                      {r.hr_note ?? r.supervisor_note ?? r.reason}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      {r.status === "pending" || r.status === "approved_supervisor" ? (
                        <ActionButton action={cancelLeave.bind(null, r.id)} confirm="Batalkan pengajuan cuti ini?" variant="ghost">
                          Batalkan
                        </ActionButton>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Belum ada pengajuan cuti.
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
