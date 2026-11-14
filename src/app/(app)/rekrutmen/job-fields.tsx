import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/action-form";
import type { Options } from "@/lib/queries";

type Job = {
  title: string;
  branch_id: string | null;
  department_id: string | null;
  position_id: string | null;
  description: string | null;
  requirements: string | null;
  quota: number;
  status: string;
};

export function JobFields({ options, job }: { options: Options; job?: Job }) {
  const sel = (name: string, value: string | null | undefined, items: { id: string; name: string }[], empty: string) => (
    <NativeSelect id={name} name={name} defaultValue={value ?? ""} className="w-full">
      <NativeSelectOption value="">{empty}</NativeSelectOption>
      {items.map((i) => (
        <NativeSelectOption key={i.id} value={i.id}>{i.name}</NativeSelectOption>
      ))}
    </NativeSelect>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField name="title" label="Judul lowongan" className="sm:col-span-2">
        <Input id="title" name="title" defaultValue={job?.title} required />
      </FormField>
      <FormField name="branch_id" label="Penempatan">{sel("branch_id", job?.branch_id, options.branches, "Fleksibel")}</FormField>
      <FormField name="department_id" label="Departemen">{sel("department_id", job?.department_id, options.departments, "—")}</FormField>
      <FormField name="position_id" label="Jabatan">{sel("position_id", job?.position_id, options.positions, "—")}</FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField name="quota" label="Kebutuhan">
          <Input id="quota" name="quota" type="number" min="1" defaultValue={job?.quota ?? 1} required />
        </FormField>
        <FormField name="status" label="Status">
          <NativeSelect id="status" name="status" defaultValue={job?.status ?? "open"} className="w-full">
            <NativeSelectOption value="draft">Draft</NativeSelectOption>
            <NativeSelectOption value="open">Dibuka</NativeSelectOption>
            <NativeSelectOption value="closed">Ditutup</NativeSelectOption>
          </NativeSelect>
        </FormField>
      </div>
      <FormField name="description" label="Deskripsi pekerjaan" className="sm:col-span-2">
        <Textarea id="description" name="description" rows={4} defaultValue={job?.description ?? ""} />
      </FormField>
      <FormField name="requirements" label="Kualifikasi" hint="Satu poin per baris." className="sm:col-span-2">
        <Textarea id="requirements" name="requirements" rows={4} defaultValue={job?.requirements ?? ""} />
      </FormField>
    </div>
  );
}
