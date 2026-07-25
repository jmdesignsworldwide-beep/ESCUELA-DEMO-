/** Tipos de dominio de inventario y biblioteca (TANDA 18). */

export type CategoriaInventario =
  | "mobiliario"
  | "equipo"
  | "tecnologia"
  | "insumo"
  | "otro";
export type EstadoActivo = "bueno" | "regular" | "malo" | "baja";

export const CATEGORIA_INV_LABELS: Record<CategoriaInventario, string> = {
  mobiliario: "Mobiliario",
  equipo: "Equipo",
  tecnologia: "Tecnología",
  insumo: "Insumo",
  otro: "Otro",
};

export const ESTADO_ACTIVO_LABELS: Record<EstadoActivo, string> = {
  bueno: "Bueno",
  regular: "Regular",
  malo: "Malo",
  baja: "Dado de baja",
};

export interface InventarioItem {
  id: string;
  sede_id: string;
  codigo: string;
  nombre: string;
  categoria: CategoriaInventario;
  cantidad: number;
  unidad: string;
  ubicacion: string | null;
  estado: EstadoActivo;
  valor_unitario: number;
}

export interface LibroCatalogo {
  id: string;
  titulo: string;
  autor: string | null;
  categoria: string | null;
  ejemplares_total: number;
  prestados: number;
  disponibles: number;
}

export interface Prestamo {
  id: string;
  libro_id: string;
  estudiante_id: string | null;
  prestatario: string;
  fecha: string;
  vence: string | null;
  devuelto_at: string | null;
}
