import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOptions, param } from "@/lib/queries";
import { EMPLOYEE_STATUS, EMPLOYMENT_TYPE } from "@/lib/format";

export const metadata: Metadata = { title: "Karyawan" };

const PAGE_SIZE = 25;

export default async function KaryawanPage({ searchParams }: PageProps<"/karyawan">) {
  await requireUser(["admin", "hr"]);
  const sp = await searchParams;
  const q = param(sp.q);
  const branch = param(sp.branch);
  const dept = param(sp.dept);
  const status = param(sp.status) ?? "active";
  const page = Math.max(1, Number(param(sp.page) ?? 1));

  const supabase = await createClient();
  const options = await getOptions();

  let query = supabase
    .from("employees")
    .select(
      "id, employee_no, full_name, email, employment_type, status, user_id, join_date, branch:branches(name), department:departments(name), position:positions(name)",
      { count: "exact" },
    )
    .order("full_name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) {
    const safe = q.replace(/[%,()]/g, " ");
    query = query.or(`full_name.ilike.%${safe}%,employee_no.ilike.%${safe}%,email.ilike.%${safe}%`);
  }
  if (branch) query = query.eq("branch_id", branch);
  if (dept) query = query.eq("department_id", dept);
  if (status !== "all") query = query.eq("status", status as "active" | "resigned" | "terminated");

  const { data: rows, count } = await query;
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const qs = (p: number) => {
    const s = new URLSearchParams();
    if (q) s.set("q", q);
    if (branch) s.set("branch", branch);
    if (dept) s.set("dept", dept);
    if (status !== "active") s.set("status", status);
    s.set("page", String(p));
    return `?${s}`;
  };

  return (
    <>
      <PageHeader
        title="Karyawan"
        description={`${count ?? 0} karyawan`}
        actions={
          <Link href="/karyawan/baru" className={buttonVariants()}>
            <Plus /> Tambah karyawan
          </Link>
        }
      />

      <form className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Cari nama, no. karyawan, email…" className="h-9 pl-8" />
        </div>
        <NativeSelect name="branch" defaultValue={branch ?? ""} className="min-w-40">
          <NativeSelectOption value="">Semua cabang</NativeSelectOption>
          {options.branches.map((b) => (
            <NativeSelectOption key={b.id} value={b.id}>{b.name}</NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect name="dept" defaultValue={dept ?? ""} className="min-w-40">
          <NativeSelectOption value="">Semua departemen</NativeSelectOption>
          {options.departments.map((d) => (
            <NativeSelectOption key={d.id} value={d.id}>{d.name}</NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect name="status" defaultValue={status} className="min-w-32">
          <NativeSelectOption value="active">Aktif</NativeSelectOption>
          <NativeSelectOption value="resigned">Resign</NativeSelectOption>
          <NativeSelectOption value="terminated">Diberhentikan</NativeSelectOption>
          <NativeSelectOption value="all">Semua status</NativeSelectOption>
        </NativeSelect>
        <Button type="submit" variant="secondary">Terapkan</Button>
      </form>

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Karyawan</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead>Kepegawaian</TableHead>
                <TableHead>Akun</TableHead>
                <TableHead className="pr-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows?.length ? (
                rows.map((r) => (
                  <TableRow key={r.id} className="relative">
                    <TableCell className="pl-4">
                      <Link href={`/karyawan/${r.id}`} className="font-medium after:absolute after:inset-0 hover:underline">
                        {r.full_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{r.employee_no} · {r.email}</p>
                    </TableCell>
                    <TableCell>
                      {r.position?.name ?? "—"}
                      <p className="text-xs text-muted-foreground">{r.department?.name}</p>
                    </TableCell>
                    <TableCell>{r.branch?.name}</TableCell>
                    <TableCell>{EMPLOYMENT_TYPE[r.employment_type]}</TableCell>
                    <TableCell className={r.user_id ? "" : "text-muted-foreground"}>{r.user_id ? "Terhubung" : "Belum"}</TableCell>
                    <TableCell className="pr-4">
                      <StatusBadge map={EMPLOYEE_STATUS} value={r.status} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Tidak ada karyawan yang cocok.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">Halaman {page} dari {totalPages}</span>
          <Link aria-disabled={page <= 1} href={qs(page - 1)} className={buttonVariants({ variant: "outline", size: "sm", className: page <= 1 ? "pointer-events-none opacity-50" : "" })}>
            Sebelumnya
          </Link>
          <Link aria-disabled={page >= totalPages} href={qs(page + 1)} className={buttonVariants({ variant: "outline", size: "sm", className: page >= totalPages ? "pointer-events-none opacity-50" : "" })}>
            Berikutnya
          </Link>
        </div>
      ) : null}
    </>
  );
}
