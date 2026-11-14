import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormDialog } from "@/components/form-dialog";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOptions } from "@/lib/queries";
import { JOB_STATUS, date } from "@/lib/format";
import { saveJob } from "./actions";
import { JobFields } from "./job-fields";

export const metadata: Metadata = { title: "Rekrutmen" };

export default async function RekrutmenPage() {
  await requireUser(["admin", "hr"]);
  const supabase = await createClient();
  const [options, { data: jobs }] = await Promise.all([
    getOptions(),
    supabase
      .from("job_postings")
      .select("id, title, status, quota, opened_at, created_at, branch:branches(name), department:departments(name), applicants(stage)")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <PageHeader
        title="Rekrutmen"
        description="Kelola lowongan dan pelamar. Lowongan berstatus Dibuka tampil di halaman karier publik."
        actions={
          <>
            <Link href="/karir" target="_blank" className={buttonVariants({ variant: "outline" })}>
              Halaman karier <ExternalLink />
            </Link>
            <FormDialog title="Lowongan baru" action={saveJob.bind(null, null)} trigger={<Button><Plus /> Lowongan</Button>} wide>
              <JobFields options={options} />
            </FormDialog>
          </>
        }
      />
      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Lowongan</TableHead>
                <TableHead>Penempatan</TableHead>
                <TableHead className="text-right">Pelamar</TableHead>
                <TableHead className="text-right">Interview</TableHead>
                <TableHead className="text-right">Diterima</TableHead>
                <TableHead>Dibuka</TableHead>
                <TableHead className="pr-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs?.length ? (
                jobs.map((j) => (
                  <TableRow key={j.id} className="relative">
                    <TableCell className="pl-4">
                      <Link href={`/rekrutmen/${j.id}`} className="font-medium after:absolute after:inset-0 hover:underline">{j.title}</Link>
                      <p className="text-xs text-muted-foreground">{j.department?.name ?? "—"} · butuh {j.quota}</p>
                    </TableCell>
                    <TableCell>{j.branch?.name ?? "Fleksibel"}</TableCell>
                    <TableCell className="text-right tabular-nums">{j.applicants.length}</TableCell>
                    <TableCell className="text-right tabular-nums">{j.applicants.filter((a) => a.stage === "interview").length}</TableCell>
                    <TableCell className="text-right tabular-nums">{j.applicants.filter((a) => a.stage === "hired").length}/{j.quota}</TableCell>
                    <TableCell className="text-muted-foreground">{date(j.opened_at)}</TableCell>
                    <TableCell className="pr-4"><StatusBadge map={JOB_STATUS} value={j.status} /></TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Belum ada lowongan.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
