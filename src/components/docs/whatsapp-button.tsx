"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WhatsAppButton({
  telefono,
  mensaje,
}: {
  telefono: string | null;
  mensaje: string;
}) {
  const abrir = () => {
    const num = (telefono ?? "").replace(/\D/g, "");
    const full = num.length === 10 ? `1${num}` : num; // RD código país 1
    const url = `https://wa.me/${full}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };
  return (
    <Button
      onClick={abrir}
      disabled={!telefono}
      className="gap-1.5 bg-[#25D366] text-white hover:brightness-105"
      size="sm"
    >
      <MessageCircle className="h-4 w-4" />
      Enviar por WhatsApp
    </Button>
  );
}
