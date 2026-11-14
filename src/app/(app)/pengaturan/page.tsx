import type { Metadata } from "next";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionForm, FormField, Submit } from "@/components/action-form";
import { ActionButton, FormDialog } from "@/components/form-dialog";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOptions } from "@/lib/queries";
import { date, rupiah } from "@/lib/format";
import { deleteMaster, saveMaster, savePayrollSettings, type MasterTable } from "./actions";
import { LocationFields } from "./location-fields";

export const metadata: Metadata = { title: "Pengaturan" };

const TZ_LABEL: Record<string, string> = { "Asia/Jakarta": "WIB", "Asia/Makassar": "WITA", "Asia/Jayapura": "WIT" };

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-primary" />
      {label}
    </label>
  );
}

function RowActions({ table, id, name, children }: { table: MasterTable; id: string; name: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-end gap-1">
      {children}
      <ActionButton action={deleteMaster.bind(null, table, id)} confirm={`Hapus "${name}"?`} variant="ghost" size="icon-sm" title="Hapus">
        <Trash2 />
      </ActionButton>
    </div>
  );
}

const editTrigger = (
  <Button variant="ghost" size="icon-sm" title="Ubah">
    <Pencil />
  </Button>
);
const addTrigger = (label: string) => (
  <Button size="sm">
    <Plus /> {label}
  </Button>
);

function Section({ title, description, action, children }: { title: string; description?: string; action: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="grid gap-1">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="px-0">{children}</CardContent>
    </Card>
  );
}

export default async function PengaturanPage() {
  await requireUser(["admin", "hr"]);
  const supabase = await createClient();
  const options = await getOptions();
  const [{ data: branches }, { data: holidays }, { data: leaveTypes }, { data: settings }, { data: shifts }, { data: components }] =
    await Promise.all([
      supabase.from("branches").select("*").order("name"),
      supabase.from("holidays").select("*, branch:branches(name)").gte("date", `${new Date().getFullYear() - 1}-01-01`).order("date"),
      supabase.from("leave_types").select("*").order("name"),
      supabase.from("payroll_settings").select("*").order("key"),
      supabase.from("shifts").select("*, branch:branches(name)").order("name"),
      supabase.from("salary_components").select("*").order("type").order("name"),
    ]);

  const deptName = (id: string | null) => options.departments.find((d) => d.id === id)?.name ?? "—";
  const branchSelect = (value?: string | null) => (
    <NativeSelect id="branch_id" name="branch_id" defaultValue={value ?? ""} className="w-full">
      <NativeSelectOption value="">Semua cabang</NativeSelectOption>
      {options.branches.map((b) => (
        <NativeSelectOption key={b.id} value={b.id}>{b.name}</NativeSelectOption>
      ))}
    </NativeSelect>
  );

  type Branch = NonNullable<typeof branches>[number];
  const branchForm = (b?: Branch) => (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField name="code" label="Kode">
        <Input id="code" name="code" defaultValue={b?.code} maxLength={10} required />
      </FormField>
      <FormField name="name" label="Nama cabang">
        <Input id="name" name="name" defaultValue={b?.name} required />
      </FormField>
      <FormField name="address" label="Alamat" className="sm:col-span-2">
        <Input id="address" name="address" defaultValue={b?.address ?? ""} />
      </FormField>
      <LocationFields lat={b?.latitude} lng={b?.longitude} />
      <FormField name="radius_m" label="Radius absen (meter)" hint="Jarak maksimal dari titik kantor.">
        <Input id="radius_m" name="radius_m" type="number" min="10" defaultValue={b?.radius_m ?? 100} required />
      </FormField>
      <FormField name="timezone" label="Zona waktu">
        <NativeSelect id="timezone" name="timezone" defaultValue={b?.timezone ?? "Asia/Jakarta"} className="w-full">
          <NativeSelectOption value="Asia/Jakarta">WIB (Asia/Jakarta)</NativeSelectOption>
          <NativeSelectOption value="Asia/Makassar">WITA (Asia/Makassar)</NativeSelectOption>
          <NativeSelectOption value="Asia/Jayapura">WIT (Asia/Jayapura)</NativeSelectOption>
        </NativeSelect>
      </FormField>
      <Check name="is_active" label="Cabang aktif" defaultChecked={b?.is_active ?? true} />
    </div>
  );

  return (
    <>
      <PageHeader title="Pengaturan" description="Data master organisasi, absensi, cuti, dan payroll." />
      <Tabs defaultValue="cabang">
        <div className="mb-2 overflow-x-auto">
          <TabsList>
            <TabsTrigger value="cabang">Cabang</TabsTrigger>
            <TabsTrigger value="organisasi">Departemen & Jabatan</TabsTrigger>
            <TabsTrigger value="shift">Shift & Libur</TabsTrigger>
            <TabsTrigger value="cuti">Jenis Cuti</TabsTrigger>
            <TabsTrigger value="gaji">Komponen Gaji</TabsTrigger>
            <TabsTrigger value="payroll">Parameter Payroll</TabsTrigger>
          </TabsList>
        </div>

        {/* CABANG */}
        <TabsContent value="cabang">
          <Section
            title="Cabang"
            description="Titik lokasi & radius dipakai untuk validasi absen lewat HP."
            action={
              <FormDialog title="Tambah cabang" action={saveMaster.bind(null, "branches", null)} trigger={addTrigger("Cabang")} wide>
                {branchForm()}
              </FormDialog>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Cabang</TableHead>
                  <TableHead>Koordinat</TableHead>
                  <TableHead className="text-right">Radius</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches?.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="pl-4">
                      <p className="font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.code} · {b.address}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <a href={`https://www.google.com/maps?q=${b.latitude},${b.longitude}`} target="_blank" rel="noreferrer" className="hover:underline">
                        {b.latitude.toFixed(5)}, {b.longitude.toFixed(5)}
                      </a>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{b.radius_m} m</TableCell>
                    <TableCell>{TZ_LABEL[b.timezone] ?? b.timezone}</TableCell>
                    <TableCell>{b.is_active ? <Badge variant="secondary">Aktif</Badge> : <Badge variant="outline">Nonaktif</Badge>}</TableCell>
                    <TableCell className="pr-4">
                      <RowActions table="branches" id={b.id} name={b.name}>
                        <FormDialog title="Ubah cabang" action={saveMaster.bind(null, "branches", b.id)} trigger={editTrigger} wide>
                          {branchForm(b)}
                        </FormDialog>
                      </RowActions>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </TabsContent>

        {/* DEPARTEMEN & JABATAN */}
        <TabsContent value="organisasi" className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <Section
            title="Departemen"
            action={
              <FormDialog title="Tambah departemen" action={saveMaster.bind(null, "departments", null)} trigger={addTrigger("Departemen")}>
                <FormField name="name" label="Nama departemen">
                  <Input id="name" name="name" required />
                </FormField>
              </FormDialog>
            }
          >
            <Table>
              <TableBody>
                {options.departments.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="pl-4">{d.name}</TableCell>
                    <TableCell className="pr-4">
                      <RowActions table="departments" id={d.id} name={d.name}>
                        <FormDialog title="Ubah departemen" action={saveMaster.bind(null, "departments", d.id)} trigger={editTrigger}>
                          <FormField name="name" label="Nama departemen">
                            <Input id="name" name="name" defaultValue={d.name} required />
                          </FormField>
                        </FormDialog>
                      </RowActions>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>

          <Section
            title="Jabatan"
            description="Gaji pokok default per jabatan (bisa di-override per karyawan)."
            action={
              <FormDialog title="Tambah jabatan" action={saveMaster.bind(null, "positions", null)} trigger={addTrigger("Jabatan")}>
                <PositionFields departments={options.departments} />
              </FormDialog>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Jabatan</TableHead>
                  <TableHead>Departemen</TableHead>
                  <TableHead className="text-right">Level</TableHead>
                  <TableHead className="text-right">Gaji pokok</TableHead>
                  <TableHead className="pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {options.positions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-4 font-medium">{p.name}</TableCell>
                    <TableCell>{deptName(p.department_id)}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.level}</TableCell>
                    <TableCell className="text-right tabular-nums">{rupiah(p.base_salary)}</TableCell>
                    <TableCell className="pr-4">
                      <RowActions table="positions" id={p.id} name={p.name}>
                        <FormDialog title="Ubah jabatan" action={saveMaster.bind(null, "positions", p.id)} trigger={editTrigger}>
                          <PositionFields departments={options.departments} p={p} />
                        </FormDialog>
                      </RowActions>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </TabsContent>

        {/* SHIFT & LIBUR */}
        <TabsContent value="shift" className="grid gap-4 lg:grid-cols-2">
          <Section
            title="Shift kerja"
            action={
              <FormDialog title="Tambah shift" action={saveMaster.bind(null, "shifts", null)} trigger={addTrigger("Shift")}>
                <ShiftFields branchSelect={branchSelect()} />
              </FormDialog>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Shift</TableHead>
                  <TableHead>Jam</TableHead>
                  <TableHead className="text-right">Toleransi</TableHead>
                  <TableHead className="pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts?.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="pl-4">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.branch?.name ?? "Semua cabang"}</p>
                    </TableCell>
                    <TableCell className="tabular-nums">{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.late_tolerance_minutes} mnt</TableCell>
                    <TableCell className="pr-4">
                      <RowActions table="shifts" id={s.id} name={s.name}>
                        <FormDialog title="Ubah shift" action={saveMaster.bind(null, "shifts", s.id)} trigger={editTrigger}>
                          <ShiftFields branchSelect={branchSelect(s.branch_id)} s={s} />
                        </FormDialog>
                      </RowActions>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>

          <Section
            title="Hari libur"
            description="Tidak dihitung sebagai hari kerja (cuti, absensi, payroll)."
            action={
              <FormDialog title="Tambah hari libur" action={saveMaster.bind(null, "holidays", null)} trigger={addTrigger("Libur")}>
                <FormField name="date" label="Tanggal">
                  <Input id="date" name="date" type="date" required />
                </FormField>
                <FormField name="name" label="Keterangan">
                  <Input id="name" name="name" placeholder="Hari Raya Idul Fitri" required />
                </FormField>
                <FormField name="branch_id" label="Berlaku untuk">{branchSelect()}</FormField>
              </FormDialog>
            }
          >
            <Table>
              <TableBody>
                {holidays?.length ? (
                  holidays.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="pl-4 whitespace-nowrap">{date(h.date)}</TableCell>
                      <TableCell>
                        {h.name}
                        <p className="text-xs text-muted-foreground">{h.branch?.name ?? "Nasional"}</p>
                      </TableCell>
                      <TableCell className="pr-4">
                        <RowActions table="holidays" id={h.id} name={h.name}>{null}</RowActions>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="py-8 text-center text-muted-foreground">Belum ada hari libur. Tambahkan libur nasional & cuti bersama tahun ini.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Section>
        </TabsContent>

        {/* JENIS CUTI */}
        <TabsContent value="cuti">
          <Section
            title="Jenis cuti"
            action={
              <FormDialog title="Tambah jenis cuti" action={saveMaster.bind(null, "leave_types", null)} trigger={addTrigger("Jenis cuti")}>
                <LeaveTypeFields />
              </FormDialog>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Jenis</TableHead>
                  <TableHead className="text-right">Kuota/tahun</TableHead>
                  <TableHead>Dibayar</TableHead>
                  <TableHead>Lampiran</TableHead>
                  <TableHead className="pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveTypes?.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="pl-4">
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.code}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{t.default_quota ?? "Tanpa batas"}</TableCell>
                    <TableCell>{t.is_paid ? "Ya" : "Tidak (potong gaji)"}</TableCell>
                    <TableCell>{t.requires_attachment ? "Wajib" : "—"}</TableCell>
                    <TableCell className="pr-4">
                      <RowActions table="leave_types" id={t.id} name={t.name}>
                        <FormDialog title="Ubah jenis cuti" action={saveMaster.bind(null, "leave_types", t.id)} trigger={editTrigger}>
                          <LeaveTypeFields t={t} />
                        </FormDialog>
                      </RowActions>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </TabsContent>

        {/* KOMPONEN GAJI */}
        <TabsContent value="gaji">
          <Section
            title="Komponen gaji"
            description="Komponen tetap diatur per karyawan; komponen tidak tetap (bonus, kasbon) diisi per periode payroll."
            action={
              <FormDialog title="Tambah komponen" action={saveMaster.bind(null, "salary_components", null)} trigger={addTrigger("Komponen")}>
                <ComponentFields />
              </FormDialog>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Komponen</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Sifat</TableHead>
                  <TableHead>Pajak</TableHead>
                  <TableHead className="pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {components?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="pl-4">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.code}</p>
                    </TableCell>
                    <TableCell>{c.type === "earning" ? "Pendapatan" : "Potongan"}</TableCell>
                    <TableCell>{c.is_fixed ? "Tetap bulanan" : "Tidak tetap"}</TableCell>
                    <TableCell>{c.type === "earning" ? (c.is_taxable ? "Kena pajak" : "Tidak") : "—"}</TableCell>
                    <TableCell className="pr-4">
                      <RowActions table="salary_components" id={c.id} name={c.name}>
                        <FormDialog title="Ubah komponen" action={saveMaster.bind(null, "salary_components", c.id)} trigger={editTrigger}>
                          <ComponentFields c={c} />
                        </FormDialog>
                      </RowActions>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </TabsContent>

        {/* PARAMETER PAYROLL */}
        <TabsContent value="payroll">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle>Parameter payroll</CardTitle>
              <CardDescription>
                Tarif dalam desimal (0,01 = 1%). Plafon upah BPJS berubah berkala — cek nilai terbaru setiap tahun. Tarif TER PPh 21
                mengikuti PP 58/2023.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActionForm action={savePayrollSettings} className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {settings?.map((s) => (
                    <FormField key={s.key} name={`s_${s.key}`} label={s.description ?? s.key}>
                      <Input id={`s_${s.key}`} name={`s_${s.key}`} type="number" step="any" min="0" defaultValue={Number(s.value)} inputMode="decimal" />
                    </FormField>
                  ))}
                </div>
                <div>
                  <Submit>Simpan parameter</Submit>
                </div>
              </ActionForm>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function PositionFields({
  departments,
  p,
}: {
  departments: { id: string; name: string }[];
  p?: { name: string; department_id: string | null; level: number; base_salary: number };
}) {
  return (
    <>
      <FormField name="name" label="Nama jabatan">
        <Input id="name" name="name" defaultValue={p?.name} required />
      </FormField>
      <FormField name="department_id" label="Departemen">
        <NativeSelect id="department_id" name="department_id" defaultValue={p?.department_id ?? ""} className="w-full">
          <NativeSelectOption value="">— Tidak ada —</NativeSelectOption>
          {departments.map((d) => (
            <NativeSelectOption key={d.id} value={d.id}>{d.name}</NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField name="level" label="Level">
          <Input id="level" name="level" type="number" min="1" defaultValue={p?.level ?? 1} required />
        </FormField>
        <FormField name="base_salary" label="Gaji pokok (Rp)">
          <Input id="base_salary" name="base_salary" type="number" min="0" step="1000" defaultValue={p?.base_salary ?? 0} required />
        </FormField>
      </div>
    </>
  );
}

function ShiftFields({
  branchSelect,
  s,
}: {
  branchSelect: React.ReactNode;
  s?: { name: string; start_time: string; end_time: string; late_tolerance_minutes: number };
}) {
  return (
    <>
      <FormField name="name" label="Nama shift">
        <Input id="name" name="name" defaultValue={s?.name} required />
      </FormField>
      <div className="grid grid-cols-3 gap-3">
        <FormField name="start_time" label="Masuk">
          <Input id="start_time" name="start_time" type="time" defaultValue={s?.start_time.slice(0, 5) ?? "08:00"} required />
        </FormField>
        <FormField name="end_time" label="Pulang">
          <Input id="end_time" name="end_time" type="time" defaultValue={s?.end_time.slice(0, 5) ?? "17:00"} required />
        </FormField>
        <FormField name="late_tolerance_minutes" label="Toleransi (mnt)">
          <Input id="late_tolerance_minutes" name="late_tolerance_minutes" type="number" min="0" defaultValue={s?.late_tolerance_minutes ?? 10} required />
        </FormField>
      </div>
      <FormField name="branch_id" label="Berlaku untuk">{branchSelect}</FormField>
    </>
  );
}

function LeaveTypeFields({
  t,
}: {
  t?: { code: string; name: string; default_quota: number | null; is_paid: boolean; requires_attachment: boolean };
}) {
  return (
    <>
      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <FormField name="code" label="Kode">
          <Input id="code" name="code" defaultValue={t?.code} required />
        </FormField>
        <FormField name="name" label="Nama">
          <Input id="name" name="name" defaultValue={t?.name} required />
        </FormField>
      </div>
      <FormField name="default_quota" label="Kuota per tahun (hari)" hint="Kosongkan bila tidak dibatasi (mis. sakit).">
        <Input id="default_quota" name="default_quota" type="number" min="0" defaultValue={t?.default_quota ?? ""} />
      </FormField>
      <Check name="is_paid" label="Tetap dibayar (tidak memotong gaji)" defaultChecked={t?.is_paid ?? true} />
      <Check name="requires_attachment" label="Wajib lampiran" defaultChecked={t?.requires_attachment ?? false} />
    </>
  );
}

function ComponentFields({
  c,
}: {
  c?: { code: string; name: string; type: string; is_taxable: boolean; is_fixed: boolean };
}) {
  return (
    <>
      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <FormField name="code" label="Kode">
          <Input id="code" name="code" defaultValue={c?.code} required />
        </FormField>
        <FormField name="name" label="Nama">
          <Input id="name" name="name" defaultValue={c?.name} required />
        </FormField>
      </div>
      <FormField name="type" label="Jenis">
        <NativeSelect id="type" name="type" defaultValue={c?.type ?? "earning"} className="w-full">
          <NativeSelectOption value="earning">Pendapatan</NativeSelectOption>
          <NativeSelectOption value="deduction">Potongan</NativeSelectOption>
        </NativeSelect>
      </FormField>
      <Check name="is_fixed" label="Tetap setiap bulan" defaultChecked={c?.is_fixed ?? true} />
      <Check name="is_taxable" label="Kena PPh 21 (untuk pendapatan)" defaultChecked={c?.is_taxable ?? true} />
    </>
  );
}
