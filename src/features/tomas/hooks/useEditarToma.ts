import { useCallback } from 'react';
import { eq } from 'drizzle-orm';

import { useDb } from '@/db/client';
import { tomas, type EstadoToma } from '@/db/schema';
import { sincronizarNotificaciones } from '@/features/notificaciones/scheduler';

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
      void sincronizarNotificaciones(db);
    },
    [db],
  );
}

/**
 * "Eliminar" una toma es un borrado suave (estado='eliminada'), no un
 * DELETE físico — ver el comentario sobre ESTADO_TOMA en schema.ts para
 * el porqué (evitar que useAsegurarTomasDeHoy la resucite).
 */
export function useEliminarToma() {
  const db = useDb();

  return useCallback(
    async (tomaId: number) => {
      await db.update(tomas).set({ estado: 'eliminada' }).where(eq(tomas.id, tomaId));
      void sincronizarNotificaciones(db);
    },
    [db],
  );
}
