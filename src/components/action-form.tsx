"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/action";

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

const FormStateContext = createContext<{ state: ActionResult; pending: boolean }>({ state: undefined, pending: false });

/**
 * Form + Server Action dengan toast otomatis dan error per-field.
 *
 * - Toast & onSuccess dipanggil langsung setelah action selesai (bukan lewat
 *   useEffect), jadi tetap jalan walau komponen ikut hilang karena revalidate
 *   (mis. baris persetujuan yang sudah diproses).
 * - Submit lewat onSubmit (bukan prop `action`) agar React tidak mengosongkan
 *   isian saat validasi gagal.
 */
export function ActionForm({
  action,
  children,
  className,
  onSuccess,
  resetOnSuccess = false,
  toastSuccess = true,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  onSuccess?: () => void;
  resetOnSuccess?: boolean;
  toastSuccess?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const opts = useRef({ onSuccess, resetOnSuccess, toastSuccess });
  useEffect(() => {
    opts.current = { onSuccess, resetOnSuccess, toastSuccess };
  });

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async (prev, formData) => {
    const res = await action(prev, formData);
    if (res?.ok) {
      if (opts.current.toastSuccess) toast.success(res.message ?? "Berhasil disimpan");
      if (opts.current.resetOnSuccess) formRef.current?.reset();
      opts.current.onSuccess?.();
    } else if (res?.error) {
      toast.error(res.error);
    }
    return res;
  }, undefined);

  return (
    <FormStateContext value={{ state, pending }}>
      <form
        ref={formRef}
        method="post" // tanpa JS: jangan pernah kirim isian lewat URL (GET)
        className={className}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          const fd = new FormData(e.currentTarget);
          startTransition(() => formAction(fd));
        }}
      >
        {children}
      </form>
    </FormStateContext>
  );
}

export function useFieldError(name: string) {
  return useContext(FormStateContext).state?.fieldErrors?.[name]?.[0];
}

/** Label + input + pesan error. Input diberikan sebagai children. */
export function FormField({
  name,
  id,
  label,
  hint,
  className,
  children,
}: {
  name: string;
  /** id input bila berbeda dari name */
  id?: string;
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const error = useFieldError(name);
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id ?? name}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function Submit({
  children,
  className,
  variant,
  size,
  pendingText,
  disabled,
}: {
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  pendingText?: string;
}) {
  const { pending } = useContext(FormStateContext);
  return (
    <Button type="submit" disabled={pending || disabled} className={className} variant={variant} size={size}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
