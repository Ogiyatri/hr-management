import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Briefcase, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { getOpenJob } from "../data";
import { apply } from "../actions";
import { ApplyForm } from "./apply-form";

export const metadata: Metadata = { title: "Detail Lowongan" };

export default function JobPublicPage({ params }: PageProps<"/karir/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <JobDetail params={params} />
    </Suspense>
  );
}

async function JobDetail({ params }: Pick<PageProps<"/karir/[id]">, "params">) {
  const { id } = await params;
  const job = await getOpenJob(id);
  if (!job) notFound();

  return (
    <>
      <PageHeader
        title={job.title}
        back={{ href: "/karir", label: "Semua lowongan" }}
        description={
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1"><MapPin className="size-4" /> {job.branch?.name ?? "Fleksibel"}</span>
            {job.department ? <span className="inline-flex items-center gap-1"><Briefcase className="size-4" /> {job.department.name}</span> : null}
            <span className="inline-flex items-center gap-1"><Users className="size-4" /> {job.quota} posisi</span>
          </span>
        }
      />
      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="grid gap-6 text-sm">
            {job.description ? (
              <section>
                <h2 className="mb-2 font-semibold">Deskripsi pekerjaan</h2>
                <p className="whitespace-pre-line text-muted-foreground">{job.description}</p>
              </section>
            ) : null}
            {job.requirements ? (
              <section>
                <h2 className="mb-2 font-semibold">Kualifikasi</h2>
                <p className="whitespace-pre-line text-muted-foreground">{job.requirements}</p>
              </section>
            ) : null}
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Lamar posisi ini</CardTitle>
          </CardHeader>
          <CardContent>
            <ApplyForm action={apply.bind(null, job.id)} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
