import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Briefcase, ChevronRight, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/page-header";
import { getOpenJobs } from "./data";

export const metadata: Metadata = { title: "Lowongan Kerja", description: "Bergabung bersama tim kami." };

export default function KarirPage() {
  return (
    <>
      <div className="mb-8 grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Lowongan kerja</h1>
        <p className="text-muted-foreground">Bergabung bersama tim kami. Pilih posisi lalu kirim lamaran beserta CV.</p>
      </div>
      <Suspense fallback={<div className="grid gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>}>
        <JobList />
      </Suspense>
    </>
  );
}

async function JobList() {
  const jobs = await getOpenJobs();
  if (!jobs.length) return <EmptyState title="Belum ada lowongan dibuka" description="Silakan cek kembali di lain waktu." />;
  return (
    <div className="grid gap-3">
      {jobs.map((j) => (
        <Link key={j.id} href={`/karir/${j.id}`}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center justify-between gap-4">
              <div className="grid gap-1">
                <p className="text-lg font-medium">{j.title}</p>
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MapPin className="size-4" /> {j.branch?.name ?? "Fleksibel"}</span>
                  {j.department ? <span className="inline-flex items-center gap-1"><Briefcase className="size-4" /> {j.department.name}</span> : null}
                </p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
