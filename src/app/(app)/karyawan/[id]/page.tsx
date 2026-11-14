import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, MailWarning, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionForm, FormField, Submit } from "@/components/action-form";
import { ActionButton, FormDialog } from "@/components/form-dialog";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ROLE_LABEL, requireUser, type AppRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOptions, param } from "@/lib/queries";
import { EMPLOYEE_STATUS, date, rupiah } from "@/lib/format";
import { EmployeeForm } from "../employee-form";
import {
  inviteAction, removeSalaryComponent, setEmployeeStatus, setRole, updateEmployee, upsertSalaryComponent,
} from "../actions";

export const metadata: Metadata = { title: "Detail Karyawan" };

export default async function EmployeeDetailPage({ params, searchParams }: PageProps<"/karyawan/[id]">) {
  const me = await requireUser(["admin", "hr"]);
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const [{ data: emp }, options, { data: comps }] = await Promise.all([
    supabase.from("employees").select("*, position:positions(name, base_salary)").eq("id", id).maybeSingle(),
    getOptions(),
    supabase
      .from("employee_salary_components")
      .select("id, amount, component:salary_components(id, name, type, is_taxable)")
      .eq("employee_id", id),
  ]);
  if (!emp) notFound();

  let role: AppRole | null = null;
  let lastSignIn: string | null = null;
  if (emp.user_id) {
    const admin = createAdminClient();
    const [{ data: r }, { data: u }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", emp.user_id).maybeSingle(),
      admin.auth.admin.getUserById(emp.user_id),
    ]);
    role = r?.role ?? "employee";
    lastSignIn = u.user?.last_sign_in_at ?? null;
  }

  const assignable: AppRole[] = me.role === "admin" ? ["employee", "manager", "hr", "admin"] : ["employee", "manager"];
  const baseSalary = Number(emp.base_salary ?? emp.position?.base_salary ?? 0);
  const fixedTotal = (comps ?? []).filter((c) => c.component?.type === "earning").reduce((s, c) => s + Number(c.amount), 0);

  return (
    <>
      <PageHeader
        title={emp.full_name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {emp.employee_no} · {emp.position?.name ?? "Tanpa jabatan"} <StatusBadge map={EMPLOYEE_STATUS} value={emp.status} />
          </span>
        }
        back={{ href: "/karyawan", label: "Karyawan" }}
      />

      {param(sp.created) ? (
        <Alert className="mb-4">
          <CheckCircle2 />
          <AlertDescription>Karyawan berhasil ditambahkan.</AlertDescription>
        </Alert>
      ) : null}
      {param(sp.invite_error) ? (
        <Alert variant="destructive" className="mb-4">
          <MailWarning />
          <AlertDescription>Karyawan tersimpan, tetapi undangan gagal dikirim. Coba lagi di tab Akun.</AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="profil">
        <TabsList className="mb-2">
          <TabsTrigger value="profil">Profil</TabsTrigger>
          <TabsTrigger value="gaji">Gaji</TabsTrigger>
          <TabsTrigger value="akun">Akun</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
        </TabsList>

        <TabsContent value="profil">
          <EmployeeForm action={updateEmployee.bind(null, id)} options={options} employee={emp} />
        </TabsContent>

        <TabsContent value="gaji" className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Gaji pokok</CardDescription>
                <CardTitle className="tabular-nums">{rupiah(baseSalary)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Tunjangan tetap</CardDescription>
                <CardTitle className="tabular-nums">{rupiah(fixedTotal)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Upah (dasar BPJS & lembur)</CardDescription>
                <CardTitle className="tabular-nums">{rupiah(baseSalary + fixedTotal)}</CardTitle>
              </CardHeader>
            </Card>
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Komponen tetap bulanan</CardTitle>
                <CardDescription>Ikut otomatis setiap generate payroll. Bonus/kasbon diatur per periode payroll.</CardDescription>
              </div>
              <FormDialog
                title="Tambah / ubah komponen"
                action={upsertSalaryComponent.bind(null, id)}
                trigger={<Button size="sm"><Plus /> Komponen</Button>}
              >
                <FormField name="component_id" label="Komponen">
                  <NativeSelect id="component_id" name="component_id" className="w-full" defaultValue="" required>
                    <NativeSelectOption value="" disabled>Pilih komponen</NativeSelectOption>
                    {options.components.filter((c) => c.is_fixed).map((c) => (
                      <NativeSelectOption key={c.id} value={c.id}>
                        {c.name} ({c.type === "earning" ? "pendapatan" : "potongan"})
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </FormField>
                <FormField name="amount" label="Nominal per bulan (Rp)">
                  <Input id="amount" name="amount" type="number" min="0" step="1000" inputMode="numeric" required />
                </FormField>
              </FormDialog>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Komponen</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                    <TableHead className="pr-4" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comps?.length ? (
                    comps.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="pl-4">{c.component?.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.component?.type === "earning" ? "Pendapatan" : "Potongan"}
                          {c.component?.is_taxable ? " · kena pajak" : ""}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{rupiah(c.amount)}</TableCell>
                        <TableCell className="pr-4 text-right">
                          <ActionButton action={removeSalaryComponent.bind(null, id, c.id)} confirm="Hapus komponen ini?" variant="ghost" size="icon-sm" title="Hapus">
                            <Trash2 />
                          </ActionButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Belum ada tunjangan tetap.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="akun">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Akun login</CardTitle>
              <CardDescription>
                {emp.user_id
                  ? `Terhubung ke ${emp.email}. Login terakhir: ${lastSignIn ? date(lastSignIn) : "belum pernah"}.`
                  : "Belum punya akun. Kirim undangan agar karyawan bisa membuat password dan login."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              {emp.user_id && role ? (
                <ActionForm action={setRole.bind(null, id)} className="flex flex-wrap items-end gap-2">
                  <FormField name="role" label={`Role saat ini: ${ROLE_LABEL[role]}`} className="min-w-48 flex-1">
                    <NativeSelect id="role" name="role" defaultValue={role} className="w-full" disabled={!assignable.includes(role)}>
                      {assignable.map((r) => (
                        <NativeSelectOption key={r} value={r}>{ROLE_LABEL[r]}</NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </FormField>
                  <Submit variant="secondary">Ubah role</Submit>
                </ActionForm>
              ) : null}
              <ActionForm action={inviteAction.bind(null, id)} className="flex flex-wrap items-end gap-2">
                {!emp.user_id ? (
                  <FormField name="role" id="role-invite" label="Role" className="min-w-48 flex-1">
                    <NativeSelect id="role-invite" name="role" defaultValue="employee" className="w-full">
                      {assignable.map((r) => (
                        <NativeSelectOption key={r} value={r}>{ROLE_LABEL[r]}</NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </FormField>
                ) : (
                  <input type="hidden" name="role" value={role ?? "employee"} />
                )}
                <Submit disabled={emp.status !== "active"}>{emp.user_id ? "Kirim ulang link atur password" : "Kirim undangan"}</Submit>
              </ActionForm>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Status kepegawaian</CardTitle>
              <CardDescription>Karyawan yang resign/diberhentikan otomatis tidak bisa login dan tidak masuk payroll.</CardDescription>
            </CardHeader>
            <CardContent>
              <ActionForm action={setEmployeeStatus.bind(null, id)} className="grid gap-4 sm:grid-cols-2">
                <FormField name="status" label="Status">
                  <NativeSelect id="status" name="status" defaultValue={emp.status} className="w-full">
                    <NativeSelectOption value="active">Aktif</NativeSelectOption>
                    <NativeSelectOption value="resigned">Resign</NativeSelectOption>
                    <NativeSelectOption value="terminated">Diberhentikan</NativeSelectOption>
                  </NativeSelect>
                </FormField>
                <FormField name="end_date" id="end_date_status" label="Tanggal berakhir">
                  <Input id="end_date_status" name="end_date" type="date" defaultValue={emp.end_date ?? ""} />
                </FormField>
                <div className="sm:col-span-2">
                  <Submit variant={emp.status === "active" ? "destructive" : "default"}>Simpan status</Submit>
                </div>
              </ActionForm>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
