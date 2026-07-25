import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireActiveUser } from "@/lib/auth/require";
import { gateAccesoDemo } from "@/lib/nexus/guard";
import { PrintButton } from "@/components/docs/print-button";

export default async function DocumentosLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireActiveUser();
  await gateAccesoDemo();

  return (
    <div className="min-h-dvh bg-muted/40 print:bg-white">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-2 print:hidden">
        <Link
          href="/academico/boletines"
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a boletines
        </Link>
        <PrintButton />
      </div>
      <div className="px-2 pb-10">{children}</div>
    </div>
  );
}
