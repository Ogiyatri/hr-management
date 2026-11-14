"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ActionForm, Submit } from "@/components/action-form";
import type { ActionResult } from "@/lib/action";

type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

/** Dialog berisi form Server Action; tertutup otomatis jika berhasil. */
export function FormDialog({
  trigger,
  title,
  description,
  action,
  children,
  submitLabel = "Simpan",
  wide = false,
}: {
  trigger: React.ReactElement;
  title: string;
  description?: string;
  action: FormAction;
  children: React.ReactNode;
  submitLabel?: string;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className={wide ? "max-h-[90svh] overflow-y-auto sm:max-w-2xl" : "max-h-[90svh] overflow-y-auto sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <ActionForm action={action} onSuccess={() => setOpen(false)} className="grid gap-4">
          {children}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Submit pendingText="Menyimpan...">{submitLabel}</Submit>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

/** Tombol yang memanggil Server Action tanpa form (opsional konfirmasi). */
export function ActionButton({
  action,
  children,
  confirm,
  variant = "outline",
  size = "sm",
  className,
  title,
}: {
  action: () => Promise<ActionResult>;
  children: React.ReactNode;
  confirm?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  title?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      title={title}
      disabled={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          const res = await action();
          if (res?.ok) {
            toast.success(res.message ?? "Berhasil");
            router.refresh();
          } else toast.error(res?.error ?? "Gagal");
        });
      }}
    >
      {pending ? <Loader2 className="animate-spin" /> : null}
      {children}
    </Button>
  );
}
