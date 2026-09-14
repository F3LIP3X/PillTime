import type { MomentoComida } from '@/db/schema';
import { claveDia } from '@/features/tomas/ocurrencias';
import { fechaDesdeClave } from './pauta';

/**
 * La dosis se sigue guardando como texto ("600 mg") en `medicamentos.dosis`
 * — lo leen Inicio, Historial, el PDF, los avisos y la tabla de códigos de
 * barras aprendidos —, pero ya no se escribe a mano: el formulario pide una
 * cantidad numérica y una unidad de esta lista y compone el texto.
 * Decisión: validar en la entrada en vez de migrar a dos columnas, porque
 * no hay ningún cálculo que necesite la cantidad como número.
 */
export const UNIDADES_DOSIS = ['mg', 'g', 'mcg', 'ml', 'UI', 'gotas', 'comp.'] as const;

export type EstadoFormularioMedicamento = {
  nombre: string;
  dosisCantidad: string;
  dosisUnidad: string;
  /** Dosis antigua que no se pudo interpretar como número + unidad; se enseña como pista. */
  dosisAnterior: string | null;
  unidadesPorToma: string;
  stockInicial: string;
  momentoComida: MomentoComida;
  notas: string;
  codigoBarras: string;
  fechaCaducidad: Date | null;
};

type MedicamentoGuardado = {
  nombre: string;
  dosis: string;
  unidadesPorToma: number;
  stockInicial: number;
  momentoComida: MomentoComida | null;
  notas: string | null;
  codigoBarras: string | null;
  fechaCaducidad: string | null;
};

export function formularioVacio(): EstadoFormularioMedicamento {
  return {
    nombre: '',
    dosisCantidad: '',
    dosisUnidad: 'mg',
    dosisAnterior: null,
    unidadesPorToma: '1',
    stockInicial: '',
    momentoComida: 'ninguno',
    notas: '',
    codigoBarras: '',
    fechaCaducidad: null,
  };
}

/** "600 mg" → { cantidad: "600", unidad: "mg" }. null si no empieza por un número. */
export function separarDosis(dosis: string): { cantidad: string; unidad: string } | null {
  const coincidencia = dosis.trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!coincidencia) return null;
  return { cantidad: coincidencia[1].replace('.', ','), unidad: coincidencia[2].trim() };
}

export function formularioDesdeMedicamento(m: MedicamentoGuardado): EstadoFormularioMedicamento {
  const dosis = separarDosis(m.dosis);
  return {
    nombre: m.nombre,
    dosisCantidad: dosis?.cantidad ?? '',
    dosisUnidad: dosis?.unidad || 'mg',
    dosisAnterior: dosis ? null : m.dosis,
    unidadesPorToma: String(m.unidadesPorToma),
    stockInicial: String(m.stockInicial),
    momentoComida: m.momentoComida ?? 'ninguno',
    notas: m.notas ?? '',
    codigoBarras: m.codigoBarras ?? '',
    fechaCaducidad: m.fechaCaducidad ? fechaDesdeClave(m.fechaCaducidad) : null,
  };
}

/** Deja solo dígitos y un separador decimal (coma o punto, se normaliza a coma). */
export function soloDecimal(texto: string): string {
  const limpio = texto.replace(/[^\d.,]/g, '').replace(/\./g, ',');
  const [entera, ...resto] = limpio.split(',');
  return resto.length > 0 ? `${entera},${resto.join('').replace(/,/g, '')}` : entera;
}

export function soloEntero(texto: string): string {
  return texto.replace(/\D/g, '');
}

export function validarFormulario(f: EstadoFormularioMedicamento): string | null {
  if (!f.nombre.trim()) return 'Falta el nombre.';
  const cantidad = Number(f.dosisCantidad.replace(',', '.'));
  if (!f.dosisCantidad || !(cantidad > 0)) return 'La dosis tiene que ser un número mayor que 0.';
  if (!(Number(f.unidadesPorToma) >= 1)) return 'Las unidades por toma tienen que ser al menos 1.';
  return null;
}

export function aDatosMedicamento(f: EstadoFormularioMedicamento) {
  return {
    nombre: f.nombre.trim(),
    dosis: `${f.dosisCantidad.replace(/,$/, '')} ${f.dosisUnidad}`.trim(),
    unidadesPorToma: Number(f.unidadesPorToma) || 1,
    stockInicial: Number(f.stockInicial) || 0,
    momentoComida: f.momentoComida,
    notas: f.notas.trim() || null,
    codigoBarras: f.codigoBarras.trim() || null,
    fechaCaducidad: f.fechaCaducidad ? claveDia(f.fechaCaducidad) : null,
  };
}

export type DatosMedicamento = ReturnType<typeof aDatosMedicamento>;

export type EstadoCaducidad = 'caducado' | 'pronto' | 'ok';

/** Aviso a partir de 30 días antes: lo que tarda en acabarse una caja normal. */
export function estadoCaducidad(fechaCaducidad: string | null, ahora = new Date()): EstadoCaducidad | null {
  if (!fechaCaducidad) return null;
  const hoy = claveDia(ahora);
  if (fechaCaducidad < hoy) return 'caducado';
  const limite = new Date(ahora);
  limite.setDate(limite.getDate() + 30);
  return fechaCaducidad <= claveDia(limite) ? 'pronto' : 'ok';
}
