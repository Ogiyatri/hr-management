"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/action-form";
import { ATTENDANCE_STATUS } from "@/lib/format";

export function AttendanceFields({
  employees,
  employeeId,
  workDate,
  status = "present",
  checkIn,
  checkOut,
  lateMinutes,
}: {
  employees?: { id: string; full_name: string; employee_no: string }[];
  employeeId?: string;
  workDate: string;
  status?: string;
  checkIn?: string;
  checkOut?: string;
  lateMinutes?: number;
}) {
  const [st, setSt] = useState(status);
  const hasTime = st === "present" || st === "late";
  return (
    <>
      {employees ? (
        <FormField name="employee_id" label="Karyawan">
          <NativeSelect id="employee_id" name="employee_id" defaultValue={employeeId ?? ""} className="w-full" required>
            <NativeSelectOption value="" disabled>Pilih karyawan</NativeSelectOption>
            {employees.map((e) => (
              <NativeSelectOption key={e.id} value={e.id}>{e.full_name} ({e.employee_no})</NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
      ) : (
        <input type="hidden" name="employee_id" value={employeeId} />
      )}
      <div className="grid grid-cols-2 gap-3">
        <FormField name="work_date" label="Tanggal">
          <Input id="work_date" name="work_date" type="date" defaultValue={workDate} required readOnly={!employees} />
        </FormField>
        <FormField name="status" label="Status">
          <NativeSelect id="status" name="status" value={st} onChange={(e) => setSt(e.target.value)} className="w-full">
            {Object.entries(ATTENDANCE_STATUS).map(([v, s]) => (
              <NativeSelectOption key={v} value={v}>{s.label}</NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
      </div>
      {hasTime ? (
        <div className="grid grid-cols-3 gap-3">
          <FormField name="check_in" label="Jam masuk">
            <Input id="check_in" name="check_in" type="time" defaultValue={checkIn} />
          </FormField>
          <FormField name="check_out" label="Jam pulang">
            <Input id="check_out" name="check_out" type="time" defaultValue={checkOut} />
          </FormField>
          {st === "late" ? (
            <FormField name="late_minutes" label="Telat (mnt)">
              <Input id="late_minutes" name="late_minutes" type="number" min="0" defaultValue={lateMinutes ?? 0} />
            </FormField>
          ) : null}
        </div>
      ) : null}
      <FormField name="note" label="Alasan koreksi" hint="Tercatat di audit log.">
        <Textarea id="note" name="note" rows={2} required placeholder="mis. HP karyawan rusak, absen manual di kantor" />
      </FormField>
    </>
  );
}
