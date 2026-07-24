import { DocumentoShell } from "@/components/docs/documento-shell";
import { formatFechaRD } from "@/lib/utils";
import { COLEGIO } from "@/lib/constants";

interface OficioProps {
  tipo: "certificacion" | "constancia_inscripcion" | "buena_conducta";
  folio: string;
  emitidoEmail?: string | null;
  estudiante: { nombre: string; codigo: string; rne: string | null };
  nivel: string;
  grado: string;
  seccion: string;
}

const TITULOS: Record<OficioProps["tipo"], string> = {
  certificacion: "Certificación de Estudios",
  constancia_inscripcion: "Constancia de Inscripción",
  buena_conducta: "Carta de Buena Conducta",
};

export function Oficio({
  tipo,
  folio,
  emitidoEmail,
  estudiante,
  nivel,
  grado,
  seccion,
}: OficioProps) {
  const cuerpo = () => {
    switch (tipo) {
      case "certificacion":
        return (
          <>
            La dirección del <strong>{COLEGIO.nombre}</strong> certifica que el
            (la) estudiante <strong>{estudiante.nombre}</strong>
            {estudiante.rne ? `, con RNE ${estudiante.rne},` : ""} cursó
            satisfactoriamente el grado <strong>{grado}</strong> del nivel{" "}
            <strong>{nivel}</strong> durante el año escolar 2025–2026, conforme
            a los planes y programas del Ministerio de Educación de la República
            Dominicana (MINERD).
          </>
        );
      case "constancia_inscripcion":
        return (
          <>
            Por medio de la presente se hace constar que el (la) estudiante{" "}
            <strong>{estudiante.nombre}</strong> (matrícula {estudiante.codigo})
            se encuentra debidamente <strong>inscrito(a)</strong> en el grado{" "}
            <strong>{grado}</strong>, sección “{seccion}”, del nivel{" "}
            <strong>{nivel}</strong>, para el año escolar 2025–2026 en esta
            institución.
          </>
        );
      case "buena_conducta":
        return (
          <>
            Se hace constar que el (la) estudiante{" "}
            <strong>{estudiante.nombre}</strong> ha observado{" "}
            <strong>buena conducta</strong> y excelentes relaciones con la
            comunidad educativa durante su permanencia en el{" "}
            {COLEGIO.nombre}, mostrando respeto por las normas de convivencia de
            la institución.
          </>
        );
    }
  };

  return (
    <DocumentoShell titulo={TITULOS[tipo]} folio={folio} emitidoEmail={emitidoEmail}>
      <p className="mb-6 text-sm">A quien pueda interesar:</p>
      <p className="text-justify leading-7">{cuerpo()}</p>
      <p className="mt-6 text-justify leading-7">
        Y para los fines que el (la) interesado(a) estime convenientes, se
        expide la presente en {COLEGIO.ciudad}, República Dominicana, a los{" "}
        {formatFechaRD(new Date())}.
      </p>

      <div className="mt-16 flex justify-center">
        <div className="w-56 border-t border-[#0F1D2E] pt-1 text-center text-xs">
          Dirección General
          <br />
          {COLEGIO.nombre}
        </div>
      </div>
    </DocumentoShell>
  );
}
