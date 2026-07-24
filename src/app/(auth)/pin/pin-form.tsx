"use client";

import { useFormState } from "react-dom";
import { AlertCircle } from "lucide-react";
import { pinLoginAction, type AuthActionState } from "../actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export function PinForm() {
  const [state, formAction] = useFormState(pinLoginAction, initialState);

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

      <div className="space-y-2">
        <Label htmlFor="codigo">Código de docente</Label>
        <Input
          id="codigo"
          name="codigo"
          inputMode="text"
          autoCapitalize="characters"
          placeholder="DOC-014"
          aria-invalid={Boolean(state.fieldErrors?.codigo)}
          required
        />
        {state.fieldErrors?.codigo && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.codigo[0]}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="pin">PIN</Label>
        <Input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          placeholder="••••"
          maxLength={8}
          className="text-center text-2xl tracking-[0.5em]"
          aria-invalid={Boolean(state.fieldErrors?.pin)}
          required
        />
        {state.fieldErrors?.pin && (
          <p className="text-xs text-destructive">{state.fieldErrors.pin[0]}</p>
        )}
      </div>

      <SubmitButton
        className="w-full"
        size="lg"
        variant="gold"
        loadingText="Verificando…"
      >
        Entrar
      </SubmitButton>
    </form>
  );
}
