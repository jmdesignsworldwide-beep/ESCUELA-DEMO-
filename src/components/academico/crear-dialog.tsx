"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import { AlertCircle, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/auth/submit-button";
import type { ActionState } from "@/app/(app)/academico/estructura/actions";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

export function CrearDialog({
  triggerLabel,
  title,
  description,
  action,
  submitLabel,
  children,
}: {
  triggerLabel: string;
  title: string;
  description?: string;
  action: Action;
  submitLabel?: string;
  children: (state: ActionState) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {/* Se monta al abrir y desmonta al cerrar → el estado se reinicia. */}
        <CrearForm
          action={action}
          submitLabel={submitLabel}
          onDone={() => setOpen(false)}
        >
          {children}
        </CrearForm>
      </DialogContent>
    </Dialog>
  );
}

function CrearForm({
  action,
  submitLabel,
  onDone,
  children,
}: {
  action: Action;
  submitLabel?: string;
  onDone: () => void;
  children: (state: ActionState) => React.ReactNode;
}) {
  const [state, formAction] = useFormState(action, {});
  const done = React.useRef(false);

  React.useEffect(() => {
    if (state.ok && !done.current) {
      done.current = true;
      toast.success("Guardado correctamente");
      onDone();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {children(state)}
      <DialogFooter className="mt-2">
        <SubmitButton>{submitLabel ?? "Guardar"}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
