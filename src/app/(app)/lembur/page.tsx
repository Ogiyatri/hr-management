import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/action-form";
import { ActionButton, FormDialog } from "@/components/form-dialog";
import { EmptyState, PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { REQUEST_STATUS, date, number } from "@/lib/format";
import { cancelOvertime, createOvertime } from "./actions";

export const metadata: Metadata = { title: "Lembur" };

export default async function LemburPage() {
  const user = await requireUser();
  if (!user.employee) {
    return (
      <>
        <PageHeader title="Lembur" />
        <EmptyState title="Akun ini tidak terhubung ke data karyawan" />
      </>
    );
  }

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("overtime_requests")
    .select("id, work_date, hours, reason, status, note")
    .eq("employee_id", user.employee.id)
    .order("work_date", { ascending: false })
    .limit(50);

  return (
    <>
      <PageHeader
        title="Lembur"
        description="Lembur dibayar setelah disetujui atasan & HR (upah/jam = 1/173 upah sebulan)."
        actions={
          <FormDialog
            title="Ajukan lembur"
            action={createOvertime}
            submitLabel="Kirim pengajuan"
            trigger={
              <Button>
                <Plus /> Ajukan lembur
              </Button>
            }
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField name="work_date" label="Tanggal">
                <Input id="work_date" name="work_date" type="date" required />
              </FormField>
              <FormField name="hours" label="Jumlah jam">
                <Input id="hours" name="hours" type="number" step="0.5" min="0.5" max="12" inputMode="decimal" required />
              </FormField>
            </div>
            <FormField name="reason" label="Pekerjaan yang dilakukan">
              <Textarea id="reason" name="reason" rows={3} required />
            </FormField>
          </FormDialog>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Riwayat lembur</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Tanggal</TableHead>
                <TableHead className="text-right">Jam</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows?.length ? (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="pl-4 whitespace-nowrap">{date(r.work_date)}</TableCell>
                    <TableCell className="text-right tabular-nums">{number(r.hours, 1)}</TableCell>
                    <TableCell className="max-w-72 truncate" title={r.note ?? r.reason}>
                      {r.reason}
                      {r.note ? <span className="text-muted-foreground"> · {r.note}</span> : null}
                    </TableCell>
                    <TableCell>
                      <StatusBadge map={REQUEST_STATUS} value={r.status} />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      {r.status === "pending" || r.status === "approved_supervisor" ? (
                        <ActionButton action={cancelOvertime.bind(null, r.id)} confirm="Batalkan pengajuan lembur ini?" variant="ghost">
                          Batalkan
                        </ActionButton>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Belum ada pengajuan lembur.
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
