"use client";

import { startTransition, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FieldProps = {
  id: string;
  label: string;
  errors?: string[];
  children: React.ReactNode;
  action?: React.ReactNode;
};

export function Field({ id, label, errors, children, action }: FieldProps) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
      {children}
      {errors?.length ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordInput(
  props: Omit<React.ComponentProps<typeof Input>, "type">,
) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="h-10 pr-10" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

/**
 * Submit lewat onSubmit (bukan prop `action`): React 19 mengosongkan form
 * setelah action selesai — termasuk saat validasi gagal — sehingga isian hilang.
 */
export function submitWithoutReset(formAction: (fd: FormData) => void, pending: boolean) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  };
}

export function SubmitButton({ children, pendingText, pending }: { children: React.ReactNode; pendingText: string; pending: boolean }) {
  return (
    <Button type="submit" size="lg" className="h-10 w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" /> {pendingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
