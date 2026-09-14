import { useCallback } from 'react';

import { useDb } from '@/db/client';
import { horariosMedicamento, tomas } from '@/db/schema';
import { sincronizarNotificaciones } from '@/features/notificaciones/scheduler';

export type NuevoTratamientoIntervalo = {
  medicamentoId: number;
  fechaHoraInicio: Date;
  /** Cada cuántas horas se repite la toma, ej. 8 = "cada 8 horas". */
  frecuenciaHoras: number;
  /** Duración total del tratamiento en días, ej. 7 = "durante una semana". */
  duracionDias: number;
};

/**
 * Da de alta un tratamiento por intervalo (ej. "cada 8 horas durante 7
 * días"): a diferencia de un horario 'semanal' (indefinido, tomas
 * generadas día a día), aquí se conoce el final desde el principio, así
 * que se generan TODAS las tomas del tratamiento de una sola vez.
 */
export function useCrearTratamientoIntervalo() {
  const db = useDb();

  return useCallback(
    async (datos: NuevoTratamientoIntervalo) => {
      const [horario] = await db
        .insert(horariosMedicamento)
        .values({
          medicamentoId: datos.medicamentoId,
          tipo: 'intervalo',
          frecuenciaHoras: datos.frecuenciaHoras,
          fechaHoraInicio: datos.fechaHoraInicio.toISOString(),
          duracionDias: datos.duracionDias,
        })
        .returning();

      const totalTomas = Math.floor((datos.duracionDias * 24) / datos.frecuenciaHoras);
      const fechasProgramadas: string[] = [];
      for (let i = 0; i < totalTomas; i++) {
        const fecha = new Date(
          datos.fechaHoraInicio.getTime() + i * datos.frecuenciaHoras * 60 * 60 * 1000,
        );
        fechasProgramadas.push(fecha.toISOString());
      }

      if (fechasProgramadas.length > 0) {
        await db.insert(tomas).values(
          fechasProgramadas.map((fechaHoraProgramada) => ({
            medicamentoId: datos.medicamentoId,
            horarioId: horario.id,
            fechaHoraProgramada,
            estado: 'pendiente' as const,
          })),
        );
      }

      void sincronizarNotificaciones(db);
      return horario;
    },
    [db],
  );
}
