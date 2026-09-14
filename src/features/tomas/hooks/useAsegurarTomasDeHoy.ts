import { useCallback } from 'react';

import { useDb, type Db } from '@/db/client';
import { tomas } from '@/db/schema';
import { cargarOcurrencias } from '@/features/tomas/cargarOcurrencias';
import { finDelDia, inicioDelDia } from '@/features/tomas/ocurrencias';

let enCurso: Promise<void> | null = null;

async function asegurar(db: Db) {
  const ahora = new Date();
  const ocurrencias = await cargarOcurrencias(db, inicioDelDia(ahora), finDelDia(ahora));
  const virtuales = ocurrencias.filter((o) => o.tomaId === null);
  if (virtuales.length === 0) return;

  await db
    .insert(tomas)
    .values(
      virtuales.map((o) => ({
        medicamentoId: o.medicamentoId,
        horarioId: o.horarioId,
        fechaHoraProgramada: o.fechaHoraProgramada,
        estado: 'pendiente' as const,
      })),
    )
    // Red de seguridad del índice único (horarioId, fechaHoraProgramada):
    // si otra ejecución ya la creó, no se duplica.
    .onConflictDoNothing();
}

/**
 * Crea (si no existen ya) las filas 'pendiente' de hoy de las pautas
 * 'semanal' activas. Idempotente: se llama en cada apertura de Inicio.
 *
 * Qué toca hoy lo decide `calcularOcurrencias`, el mismo cálculo que usan
 * los avisos, así que respeta `fechaFin` (pauta con fecha límite) y
 * `fechaHoraInicio` (no crea tomas de horas anteriores a dar de alta la
 * pauta), y no resucita una toma que ya tenga fila ese día en cualquier
 * estado — ni aunque se le haya cambiado la hora.
 *
 * Las 'intervalo' no pasan por aquí: sus tomas se crean todas al dar de
 * alta el tratamiento (useCrearTratamientoIntervalo), así que nunca son
 * virtuales.
 *
 * Si ya hay una ejecución en marcha se reutiliza en vez de lanzar otra en
 * paralelo. Antes dos llamadas solapadas (foco de Inicio repetido) veían
 * las dos "no existe" y creaban la misma toma dos veces.
 *
 * No hay un job en segundo plano: si la app no se abre un día, ese día no
 * queda registrado como "omitido".
 */
export function useAsegurarTomasDeHoy() {
  const db = useDb();

  return useCallback(() => {
    if (!enCurso) {
      enCurso = asegurar(db).finally(() => {
        enCurso = null;
      });
    }
    return enCurso;
  }, [db]);
}
