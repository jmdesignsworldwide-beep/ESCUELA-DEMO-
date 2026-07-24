"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PeriodosPanel } from "./panels/periodos-panel";
import { NivelesPanel } from "./panels/niveles-panel";
import { EspaciosPanel } from "./panels/espacios-panel";
import { SeccionesPanel } from "./panels/secciones-panel";
import { AsignaturasPanel } from "./panels/asignaturas-panel";
import { PonderacionPanel } from "./panels/ponderacion-panel";
import type {
  Aula,
  ComponentePonderacion,
  EsquemaPonderacion,
  Grado,
  Jornada,
  Nivel,
  Periodo,
  PensumItem,
  Seccion,
  Asignatura,
} from "@/lib/academic/types";

export function EstructuraView({
  canWrite,
  periodos,
  niveles,
  grados,
  jornadas,
  aulas,
  asignaturas,
  secciones,
  pensum,
  esquema,
  componentes,
}: {
  canWrite: boolean;
  periodos: Periodo[];
  niveles: Nivel[];
  grados: Grado[];
  jornadas: Jornada[];
  aulas: Aula[];
  asignaturas: Asignatura[];
  secciones: Seccion[];
  pensum: PensumItem[];
  esquema: EsquemaPonderacion | null;
  componentes: ComponentePonderacion[];
}) {
  return (
    <Tabs defaultValue="periodos" className="w-full">
      <TabsList className="mb-2 w-full justify-start">
        <TabsTrigger value="periodos">Períodos</TabsTrigger>
        <TabsTrigger value="niveles">Niveles y grados</TabsTrigger>
        <TabsTrigger value="espacios">Jornadas y aulas</TabsTrigger>
        <TabsTrigger value="secciones">Secciones</TabsTrigger>
        <TabsTrigger value="asignaturas">Asignaturas y pénsum</TabsTrigger>
        <TabsTrigger value="ponderacion">Ponderación</TabsTrigger>
      </TabsList>

      <TabsContent value="periodos">
        <PeriodosPanel periodos={periodos} />
      </TabsContent>
      <TabsContent value="niveles">
        <NivelesPanel niveles={niveles} grados={grados} />
      </TabsContent>
      <TabsContent value="espacios">
        <EspaciosPanel jornadas={jornadas} aulas={aulas} canWrite={canWrite} />
      </TabsContent>
      <TabsContent value="secciones">
        <SeccionesPanel
          secciones={secciones}
          niveles={niveles}
          grados={grados}
          jornadas={jornadas}
          aulas={aulas}
          canWrite={canWrite}
        />
      </TabsContent>
      <TabsContent value="asignaturas">
        <AsignaturasPanel
          asignaturas={asignaturas}
          grados={grados}
          niveles={niveles}
          pensum={pensum}
          canWrite={canWrite}
        />
      </TabsContent>
      <TabsContent value="ponderacion">
        <PonderacionPanel
          esquema={esquema}
          componentes={componentes}
          canWrite={canWrite}
        />
      </TabsContent>
    </Tabs>
  );
}
