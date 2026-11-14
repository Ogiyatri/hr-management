import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileText, Pencil, Plus, Star, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/action-form";
import { ActionButton, FormDialog } from "@/components/form-dialog";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOptions } from "@/lib/queries";
import { APPLICANT_STAGE, JOB_STATUS, date } from "@/lib/format";
import { addApplicant, hireApplicant, saveJob, updateApplicant } from "../actions";
import { JobFields } from "../job-fields";

export const metadata: Metadata = { title: "Detail Lowongan" };

const PIPELINE = ["applied", "screening", "interview", "offering", "hired", "rejected"] as const;

export default async function JobDetailPage({ params }: PageProps<"/rekrutmen/[id]">) {
  await requireUser(["admin", "hr"]);
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: job }, { data: applicants }, options] = await Promise.all([
    supabase.from("job_postings").select("*, branch:branches(name), department:departments(name), position:positions(name)").eq("id", id).maybeSingle(),
    supabase.from("applicants").select("*").eq("job_posting_id", id).order("applied_at", { ascending: false }),
    getOptions(),
  ]);
  if (!job) notFound();

  const cvPaths = (applicants ?? []).map((a) => a.cv_path).filter((p): p is string => Boolean(p));
  const cvUrls = new Map<string, string>();
  if (cvPaths.length) {
    const { data } = await supabase.storage.from("applicant-cvs").createSignedUrls(cvPaths, 600);
    data?.forEach((d) => d.path && d.signedUrl && cvUrls.set(d.path, d.signedUrl));
  }

  return (
    <>
      <PageHeader
        title={job.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {job.branch?.name ?? "Fleksibel"} · {job.department?.name ?? "—"} · butuh {job.quota} orang
            <StatusBadge map={JOB_STATUS} value={job.status} />
          </span>
        }
        back={{ href: "/rekrutmen", label: "Rekrutmen" }}
        actions={
          <>
            <FormDialog title="Ubah lowongan" action={saveJob.bind(null, id)} trigger={<Button variant="outline"><Pencil /> Ubah</Button>} wide>
              <JobFields options={options} job={job} />
            </FormDialog>
            <FormDialog title="Tambah pelamar manual" action={addApplicant.bind(null, id)} trigger={<Button><Plus /> Pelamar</Button>}>
              <FormField name="full_name" label="Nama lengkap"><Input id="full_name" name="full_name" required /></FormField>
              <FormField name="email" label="Email"><Input id="email" name="email" type="email" required /></FormField>
              <FormField name="phone" label="No. HP"><Input id="phone" name="phone" type="tel" /></FormField>
              <FormField name="notes" label="Catatan"><Textarea id="notes" name="notes" rows={2} /></FormField>
            </FormDialog>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PIPELINE.map((stage) => {
          const list = (applicants ?? []).filter((a) => a.stage === stage);
          return (
            <Card key={stage} size="sm" className="bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  <StatusBadge map={APPLICANT_STAGE} value={stage} />
                  <span className="text-muted-foreground tabular-nums">{list.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {list.length ? (
                  list.map((a) => (
                    <div key={a.id} className="grid gap-2 rounded-lg border bg-background p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{a.full_name}</p>
                          <p className="truncate text-xs text-muted-foreground">{a.email}{a.phone ? ` · ${a.phone}` : ""}</p>
                          <p className="text-xs text-muted-foreground">Melamar {date(a.applied_at)}</p>
                        </div>
                        {a.rating ? (
                          <span className="inline-flex items-center gap-0.5 text-xs text-amber-600">
                            <Star className="size-3 fill-current" /> {a.rating}
                          </span>
                        ) : null}
                      </div>
                      {a.notes ? <p className="line-clamp-2 text-xs text-muted-foreground">{a.notes}</p> : null}
                      <div className="flex flex-wrap gap-1">
                        {a.cv_path && cvUrls.get(a.cv_path) ? (
                          <a href={cvUrls.get(a.cv_path)} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs hover:bg-muted">
                            <FileText className="size-3" /> CV
                          </a>
                        ) : null}
                        {stage !== "hired" ? (
                          <FormDialog
                            title={`Proses ${a.full_name}`}
                            action={updateApplicant.bind(null, id, a.id)}
                            trigger={<Button variant="outline" size="xs">Ubah tahap</Button>}
                          >
                            <FormField name="stage" label="Tahap">
                              <NativeSelect id="stage" name="stage" defaultValue={a.stage} className="w-full">
                                {PIPELINE.filter((s) => s !== "hired").map((s) => (
                                  <NativeSelectOption key={s} value={s}>{APPLICANT_STAGE[s].label}</NativeSelectOption>
                                ))}
                              </NativeSelect>
                            </FormField>
                            <FormField name="rating" label="Penilaian (1–5)">
                              <Input id="rating" name="rating" type="number" min="1" max="5" defaultValue={a.rating ?? ""} />
                            </FormField>
                            <FormField name="notes" label="Catatan">
                              <Textarea id="notes" name="notes" rows={3} defaultValue={a.notes ?? ""} />
                            </FormField>
                          </FormDialog>
                        ) : null}
                        {stage === "offering" || stage === "interview" ? (
                          <ActionButton
                            action={hireApplicant.bind(null, id, a.id)}
                            confirm={`Terima ${a.full_name} sebagai karyawan? Data karyawan baru akan dibuat.`}
                            variant="default"
                            size="xs"
                          >
                            <UserCheck /> Terima
                          </ActionButton>
                        ) : null}
                        {a.hired_employee_id ? (
                          <a href={`/karyawan/${a.hired_employee_id}`} className="inline-flex h-7 items-center rounded-md border px-2 text-xs hover:bg-muted">
                            Lihat karyawan
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-xs text-muted-foreground">Kosong</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {job.description || job.requirements ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Detail lowongan</CardTitle>
            <CardDescription>Ditampilkan di halaman karier saat status Dibuka.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="mb-1 font-medium">Deskripsi</p>
              <p className="whitespace-pre-line text-muted-foreground">{job.description ?? "—"}</p>
            </div>
            <div>
              <p className="mb-1 font-medium">Kualifikasi</p>
              <p className="whitespace-pre-line text-muted-foreground">{job.requirements ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
