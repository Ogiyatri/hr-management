"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { FormField } from "@/components/action-form";

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, "0")}` };
}

/** Pilih bulan → tanggal periode absensi terisi otomatis (bisa diubah untuk cut-off). */
export function PeriodFields({ branches, defaultMonth }: { branches: { id: string; name: string }[]; defaultMonth: string }) {
  const [month, setMonth] = useState(defaultMonth);
  const [range, setRange] = useState(monthRange(defaultMonth));
  return (
    <>
      <FormField name="month" label="Bulan gaji">
        <Input
          id="month"
          name="month"
          type="month"
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            if (e.target.value) setRange(monthRange(e.target.value));
          }}
          required
        />
      </FormField>
      <FormField name="branch_id" label="Cabang">
        <NativeSelect id="branch_id" name="branch_id" defaultValue="" className="w-full">
          <NativeSelectOption value="">Semua cabang</NativeSelectOption>
          {branches.map((b) => (
            <NativeSelectOption key={b.id} value={b.id}>{b.name}</NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField name="start_date" label="Absensi dari">
          <Input id="start_date" name="start_date" type="date" value={range.start} onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))} required />
        </FormField>
        <FormField name="end_date" label="Sampai">
          <Input id="end_date" name="end_date" type="date" value={range.end} onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))} required />
        </FormField>
      </div>
      <p className="text-xs text-muted-foreground">Ubah tanggal bila memakai cut-off (mis. 26 bulan lalu – 25 bulan ini).</p>
    </>
  );
}
