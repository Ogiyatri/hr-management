"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, PasswordInput, SubmitButton, submitWithoutReset } from "@/components/auth/form-parts";
import { updatePassword } from "../actions";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, undefined);
  const fe = state?.fieldErrors;

  return (
    <form method="post" onSubmit={submitWithoutReset(action, pending)} className="grid gap-4" noValidate>
      {state?.error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Field id="password" label="Password baru" errors={fe?.password}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          aria-invalid={Boolean(fe?.password)}
          aria-describedby={fe?.password ? "password-error" : "password-hint"}
          required
          autoFocus
        />
        {!fe?.password ? (
          <p id="password-hint" className="text-xs text-muted-foreground">
            Minimal 8 karakter, berisi huruf besar, huruf kecil, dan angka.
          </p>
        ) : null}
      </Field>

      <Field id="confirm" label="Ulangi password" errors={fe?.confirm}>
        <PasswordInput
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          aria-invalid={Boolean(fe?.confirm)}
          aria-describedby={fe?.confirm ? "confirm-error" : undefined}
          required
        />
      </Field>

      <SubmitButton pendingText="Menyimpan..." pending={pending}>Simpan password</SubmitButton>
    </form>
  );
}
