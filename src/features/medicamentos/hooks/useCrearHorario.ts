import { useCallback } from 'react';

import { useDb } from '@/db/client';
import { horariosMedicamento } from '@/db/schema';
import { sincronizarNotificaciones } from '@/features/notificaciones/scheduler';

export type NuevoHorarioSemanal = {
  medicamentoId: number;
  hora: string;
  diasSemana: number[];
  /** Último día incluido, "YYYY-MM-DD" local. null o ausente = indefinido. */
  fechaFin?: string | null;
};

export function useCrearHorario() {
  const db = useDb();

  return useCallback(
    async (datos: NuevoHorarioSemanal) => {
      await db.insert(horariosMedicamento).values({
        medicamentoId: datos.medicamentoId,
        tipo: 'semanal',
        hora: datos.hora,
        diasSemana: datos.diasSemana.join(','),
        // Vigente desde ahora: no se generan tomas de horas que ya pasaron
        // antes de crear la pauta (ver fechaHoraInicio en schema.ts).
        fechaHoraInicio: new Date().toISOString(),
        fechaFin: datos.fechaFin ?? null,
      });
      void sincronizarNotificaciones(db);
    },
    [db],
  );
}
