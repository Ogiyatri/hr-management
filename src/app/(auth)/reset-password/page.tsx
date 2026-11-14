import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Buat Password" };

/**
 * Dibuka dari link undangan / lupa password (lewat /auth/confirm yang sudah
 * membuat sesi), atau oleh user yang sedang login untuk mengganti password.
 */
export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Buat password baru</CardTitle>
        <CardDescription>
          <Suspense fallback={<Skeleton className="h-4 w-48" />}>
            <AccountEmail />
          </Suspense>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}

async function AccountEmail() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?error=link");
  return (
    <>
      Akun: <span className="font-medium text-foreground">{String(data.claims.email ?? "")}</span>
    </>
  );
}
