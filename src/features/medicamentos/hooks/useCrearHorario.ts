import { useCallback } from 'react';

import { useDb } from '@/db/client';
import { horariosMedicamento } from '@/db/schema';
import { reprogramarNotificaciones } from '@/features/notificaciones/scheduler';

export function useCrearHorario() {
  const db = useDb();

  return useCallback(
    async (datos: { medicamentoId: number; hora: string; diasSemana: number[] }) => {
      await db.insert(horariosMedicamento).values({
        medicamentoId: datos.medicamentoId,
        tipo: 'semanal',
        hora: datos.hora,
        diasSemana: datos.diasSemana.join(','),
      });
      await reprogramarNotificaciones(db);
    },
    [db],
  );
}
