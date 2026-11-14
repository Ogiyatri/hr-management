import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

const ERRORS: Record<string, string> = {
  inactive: "Akun Anda tidak aktif atau belum terhubung ke data karyawan. Hubungi HR.",
  link: "Link tidak valid atau sudah kedaluwarsa. Silakan minta link baru.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Masuk</CardTitle>
        <CardDescription>Gunakan email kantor yang didaftarkan oleh HR.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* searchParams = data request → di dalam Suspense (Cache Components) */}
        {/* Fallback non-interaktif agar isian tidak hilang saat form asli menggantikannya */}
        <Suspense fallback={<LoginSkeleton />}>
          <LoginFormWithParams searchParams={searchParams} />
        </Suspense>
      </CardContent>
    </Card>
  );
}

async function LoginFormWithParams({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next, error } = await searchParams;
  return (
    <LoginForm
      next={typeof next === "string" ? next : undefined}
      initialError={typeof error === "string" ? ERRORS[error] : undefined}
    />
  );
}

function LoginSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <Skeleton className="h-14" />
      <Skeleton className="h-14" />
      <Skeleton className="h-10" />
    </div>
  );
}
