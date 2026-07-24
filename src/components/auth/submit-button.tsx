"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Botón de envío que refleja el estado pendiente del formulario. */
export function SubmitButton({
  children,
  loadingText,
  disabled,
  ...props
}: ButtonProps & { loadingText?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      aria-busy={pending}
      disabled={pending || disabled}
      {...props}
    >
      {pending && <Loader2 className="animate-spin" />}
      {pending ? (loadingText ?? "Procesando…") : children}
    </Button>
  );
}
