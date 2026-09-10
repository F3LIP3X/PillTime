import { useCallback } from 'react';
import { eq } from 'drizzle-orm';

import { useDb } from '@/db/client';
import { tomas, type EstadoToma } from '@/db/schema';

export type DatosToma = {
  fechaHoraProgramada: string;
  estado: EstadoToma;
  motivoOmision?: string;
};

/** Edición manual de una toma ya existente (corregir hora, estado o motivo). */
export function useActualizarToma() {
  const db = useDb();

  return useCallback(
    async (tomaId: number, datos: DatosToma) => {
      await db
        .update(tomas)
        .set({
          fechaHoraProgramada: datos.fechaHoraProgramada,
          estado: datos.estado,
          motivoOmision: datos.estado === 'omitido' ? datos.motivoOmision : null,
          fechaHoraRegistrada: datos.estado === 'pendiente' ? null : new Date().toISOString(),
        })
        .where(eq(tomas.id, tomaId));
    },
    [db],
  );
}

export function useEliminarToma() {
  const db = useDb();

  return useCallback(
    async (tomaId: number) => {
      await db.delete(tomas).where(eq(tomas.id, tomaId));
    },
    [db],
  );
}
