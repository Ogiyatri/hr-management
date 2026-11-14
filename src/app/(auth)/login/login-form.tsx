"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Field, PasswordInput, SubmitButton, submitWithoutReset } from "@/components/auth/form-parts";
import { login } from "../actions";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  const error = state ? state.error : initialError;
  const fe = state?.fieldErrors;

  return (
    <form method="post" onSubmit={submitWithoutReset(action, pending)} className="grid gap-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
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

      <Field
        id="password"
        label="Password"
        errors={fe?.password}
        action={
          <Link href="/forgot-password" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            Lupa password?
          </Link>
        }
      >
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          aria-invalid={Boolean(fe?.password)}
          aria-describedby={fe?.password ? "password-error" : undefined}
          required
        />
      </Field>

      <SubmitButton pendingText="Memproses..." pending={pending}>Masuk</SubmitButton>
    </form>
  );
}
