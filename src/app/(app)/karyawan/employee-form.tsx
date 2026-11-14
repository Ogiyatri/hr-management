"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, FormField, Submit } from "@/components/action-form";
import type { ActionResult } from "@/lib/action";
import type { Options } from "@/lib/queries";
import { EMPLOYMENT_TYPE, PTKP_OPTIONS, rupiah } from "@/lib/format";
import type { Database } from "@/lib/database.types";

type Employee = Database["public"]["Tables"]["employees"]["Row"];
type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

function Select({
  name, value, options, placeholder, required,
}: {
  name: string;
  value?: string | null;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <NativeSelect id={name} name={name} defaultValue={value ?? ""} className="w-full" required={required}>
      <NativeSelectOption value="">{placeholder ?? "— Tidak ada —"}</NativeSelectOption>
      {options.map((o) => (
        <NativeSelectOption key={o.value} value={o.value}>
          {o.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

export function EmployeeForm({
  action,
  options,
  employee,
  defaultEmployeeNo,
  canInvite,
  assignableRoles = [],
}: {
  action: Action;
  options: Options;
  employee?: Employee;
  defaultEmployeeNo?: string;
  canInvite?: boolean;
  assignableRoles?: { value: string; label: string }[];
}) {
  const e = employee;
  const [positionId, setPositionId] = useState(e?.position_id ?? "");
  const position = options.positions.find((p) => p.id === positionId);

  return (
    <ActionForm action={action} className="grid gap-6" toastSuccess>
      <Card>
        <CardHeader>
          <CardTitle>Data pribadi</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField name="employee_no" label="No. karyawan">
            <Input id="employee_no" name="employee_no" defaultValue={e?.employee_no ?? defaultEmployeeNo} required />
          </FormField>
          <FormField name="full_name" label="Nama lengkap">
            <Input id="full_name" name="full_name" defaultValue={e?.full_name} required />
          </FormField>
          <FormField name="email" label="Email" hint="Dipakai untuk login.">
            <Input id="email" name="email" type="email" defaultValue={e?.email} required />
          </FormField>
          <FormField name="phone" label="No. HP">
            <Input id="phone" name="phone" type="tel" defaultValue={e?.phone ?? ""} />
          </FormField>
          <FormField name="nik" label="NIK (KTP)">
            <Input id="nik" name="nik" inputMode="numeric" maxLength={16} defaultValue={e?.nik ?? ""} />
          </FormField>
          <FormField name="npwp" label="NPWP">
            <Input id="npwp" name="npwp" defaultValue={e?.npwp ?? ""} />
          </FormField>
          <FormField name="gender" label="Jenis kelamin">
            <Select
              name="gender"
              value={e?.gender}
              placeholder="— Pilih —"
              options={[
                { value: "male", label: "Laki-laki" },
                { value: "female", label: "Perempuan" },
              ]}
            />
          </FormField>
          <FormField name="birth_date" label="Tanggal lahir">
            <Input id="birth_date" name="birth_date" type="date" defaultValue={e?.birth_date ?? ""} />
          </FormField>
          <FormField name="address" label="Alamat" className="sm:col-span-2">
            <Textarea id="address" name="address" rows={2} defaultValue={e?.address ?? ""} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pekerjaan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField name="branch_id" label="Cabang">
            <Select name="branch_id" value={e?.branch_id} placeholder="— Pilih cabang —" required
              options={options.branches.map((b) => ({ value: b.id, label: b.name }))} />
          </FormField>
          <FormField name="department_id" label="Departemen">
            <Select name="department_id" value={e?.department_id}
              options={options.departments.map((d) => ({ value: d.id, label: d.name }))} />
          </FormField>
          <FormField name="position_id" label="Jabatan">
            <NativeSelect id="position_id" name="position_id" className="w-full" value={positionId}
              onChange={(ev) => setPositionId(ev.target.value)}>
              <NativeSelectOption value="">— Tidak ada —</NativeSelectOption>
              {options.positions.map((p) => (
                <NativeSelectOption key={p.id} value={p.id}>{p.name}</NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
          <FormField name="supervisor_id" label="Atasan langsung" hint="Menyetujui cuti & lembur tahap pertama.">
            <Select name="supervisor_id" value={e?.supervisor_id}
              options={options.employees.filter((x) => x.id !== e?.id).map((x) => ({ value: x.id, label: `${x.full_name} (${x.employee_no})` }))} />
          </FormField>
          <FormField name="shift_id" label="Shift kerja">
            <Select name="shift_id" value={e?.shift_id}
              options={options.shifts.map((s) => ({ value: s.id, label: `${s.name} (${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)})` }))} />
          </FormField>
          <FormField name="employment_type" label="Status kepegawaian">
            <Select name="employment_type" value={e?.employment_type ?? "permanent"} required placeholder="— Pilih —"
              options={Object.entries(EMPLOYMENT_TYPE).map(([value, label]) => ({ value, label }))} />
          </FormField>
          <FormField name="join_date" label="Tanggal masuk">
            <Input id="join_date" name="join_date" type="date" required
              defaultValue={e?.join_date ?? new Date().toISOString().slice(0, 10)} />
          </FormField>
          <FormField name="end_date" label="Akhir kontrak" hint="Kosongkan untuk karyawan tetap.">
            <Input id="end_date" name="end_date" type="date" defaultValue={e?.end_date ?? ""} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gaji, pajak & BPJS</CardTitle>
          <CardDescription>Tunjangan tetap diatur di halaman detail karyawan.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField name="base_salary" label="Gaji pokok khusus (Rp)"
            hint={position ? `Kosongkan untuk ikut gaji jabatan: ${rupiah(position.base_salary)}` : "Kosongkan untuk ikut gaji pokok jabatan."}>
            <Input id="base_salary" name="base_salary" type="number" min="0" step="1000" inputMode="numeric"
              defaultValue={e?.base_salary ?? ""} />
          </FormField>
          <FormField name="ptkp_status" label="Status PTKP" hint="Menentukan kategori TER PPh 21 (A/B/C).">
            <Select name="ptkp_status" value={e?.ptkp_status ?? "TK/0"} required placeholder="— Pilih —"
              options={PTKP_OPTIONS.map((p) => ({ value: p, label: p }))} />
          </FormField>
          <FormField name="bank_name" label="Bank">
            <Input id="bank_name" name="bank_name" defaultValue={e?.bank_name ?? ""} placeholder="BCA, Mandiri, ..." />
          </FormField>
          <FormField name="bank_account" label="No. rekening">
            <Input id="bank_account" name="bank_account" inputMode="numeric" defaultValue={e?.bank_account ?? ""} />
          </FormField>
          <FormField name="bpjs_kesehatan_no" label="No. BPJS Kesehatan">
            <Input id="bpjs_kesehatan_no" name="bpjs_kesehatan_no" defaultValue={e?.bpjs_kesehatan_no ?? ""} />
          </FormField>
          <FormField name="bpjs_ketenagakerjaan_no" label="No. BPJS Ketenagakerjaan">
            <Input id="bpjs_ketenagakerjaan_no" name="bpjs_ketenagakerjaan_no" defaultValue={e?.bpjs_ketenagakerjaan_no ?? ""} />
          </FormField>
        </CardContent>
      </Card>

      {canInvite ? (
        <Card>
          <CardHeader>
            <CardTitle>Akun login</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="send_invite" defaultChecked className="size-4 accent-primary" />
              Kirim undangan ke email karyawan untuk membuat password
            </label>
            <FormField name="role" label="Role">
              <Select name="role" value="employee" placeholder="— Pilih —" options={assignableRoles} />
            </FormField>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex justify-end">
        <Submit pendingText="Menyimpan..." size="lg">Simpan</Submit>
      </div>
    </ActionForm>
  );
}
