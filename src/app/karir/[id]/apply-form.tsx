"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, FormField, Submit } from "@/components/action-form";
import type { ActionResult } from "@/lib/action";

export function ApplyForm({ action }: { action: (prev: ActionResult, fd: FormData) => Promise<ActionResult> }) {
  const [sent, setSent] = useState(false);
  if (sent) {
    return (
      <div className="grid place-items-center gap-2 py-8 text-center">
        <CheckCircle2 className="size-10 text-emerald-600" />
        <p className="font-medium">Lamaran terkirim!</p>
        <p className="text-sm text-muted-foreground">Tim HR akan menghubungi Anda melalui email atau telepon bila lolos seleksi.</p>
      </div>
    );
  }
  return (
    <ActionForm action={action} onSuccess={() => setSent(true)} toastSuccess={false} className="grid gap-4">
      {/* honeypot anti-bot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <FormField name="full_name" label="Nama lengkap">
        <Input id="full_name" name="full_name" autoComplete="name" required />
      </FormField>
      <FormField name="email" label="Email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </FormField>
      <FormField name="phone" label="No. HP / WhatsApp">
        <Input id="phone" name="phone" type="tel" autoComplete="tel" required />
      </FormField>
      <FormField name="cv" label="CV (PDF, maks. 4 MB)">
        <Input id="cv" name="cv" type="file" accept="application/pdf" required />
      </FormField>
      <FormField name="notes" label="Pesan singkat (opsional)">
        <Textarea id="notes" name="notes" rows={3} />
      </FormField>
      <Submit pendingText="Mengirim..." size="lg">Kirim lamaran</Submit>
      <p className="text-xs text-muted-foreground">Data Anda hanya digunakan untuk proses rekrutmen.</p>
    </ActionForm>
  );
}
