import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Formatea un monto en pesos dominicanos: RD$ 12,500.00 */
export function formatRD(amount: number): string {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
  })
    .format(amount)
    .replace("DOP", "RD$")
    .replace("$", "RD$")
    .replace("RD$RD$", "RD$");
}

/** Fecha dominicana DD/MM/AAAA */
export function formatFechaRD(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/** Iniciales para avatares (máx. 2) */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}
