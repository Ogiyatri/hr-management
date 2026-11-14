"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, FormField, Submit } from "@/components/action-form";
import { decide } from "./actions";

export function DecisionButtons({
  kind,
  id,
  summary,
  stage,
}: {
  kind: "leave" | "overtime";
  id: string;
  summary: string;
  stage: "supervisor" | "hr";
}) {
  return (
    <div className="flex justify-end gap-2">
      <DecisionDialog kind={kind} id={id} summary={summary} decision="reject" stage={stage} />
      <DecisionDialog kind={kind} id={id} summary={summary} decision="approve" stage={stage} />
    </div>
  );
}

function DecisionDialog({
  kind,
  id,
  summary,
  decision,
  stage,
}: {
  kind: "leave" | "overtime";
  id: string;
  summary: string;
  decision: "approve" | "reject";
  stage: "supervisor" | "hr";
}) {
  const [open, setOpen] = useState(false);
  const approve = decision === "approve";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant={approve ? "default" : "outline"}>
            {approve ? <Check /> : <X />}
            {approve ? "Setujui" : "Tolak"}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{approve ? "Setujui pengajuan?" : "Tolak pengajuan?"}</DialogTitle>
          <DialogDescription>
            {summary}
            {approve && stage === "supervisor" ? " — setelah ini diteruskan ke HR." : ""}
          </DialogDescription>
        </DialogHeader>
        <ActionForm action={decide} onSuccess={() => setOpen(false)} className="grid gap-4">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="decision" value={decision} />
          <FormField name="note" label={approve ? "Catatan (opsional)" : "Alasan penolakan"}>
            <Textarea id="note" name="note" rows={3} required={!approve} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Submit variant={approve ? "default" : "destructive"}>{approve ? "Setujui" : "Tolak"}</Submit>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
