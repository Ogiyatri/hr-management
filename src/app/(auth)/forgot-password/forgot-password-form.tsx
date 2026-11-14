"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, ArrowLeft, MailCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Field, SubmitButton, submitWithoutReset } from "@/components/auth/form-parts";
import { requestPasswordReset } from "../actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  const fe = state?.fieldErrors;

  return (
    <div className="grid gap-4">
      {state?.success ? (
        <Alert>
          <MailCheck />
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : (
        <form method="post" onSubmit={submitWithoutReset(action, pending)} className="grid gap-4" noValidate>
          {state?.error ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <Field id="email" label="Email" errors={fe?.email}>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="nama@perusahaan.com"
              defaultValue={state?.values?.email}
              aria-invalid={Boolean(fe?.email)}
              aria-describedby={fe?.email ? "email-error" : undefined}
              className="h-10"
              required
              autoFocus
            />
          </Field>

          <SubmitButton pendingText="Mengirim..." pending={pending}>Kirim link</SubmitButton>
        </form>
      )}

      <Link
        href="/login"
        className="inline-flex items-center justify-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" /> Kembali ke halaman masuk
      </Link>
    </div>
  );
}
