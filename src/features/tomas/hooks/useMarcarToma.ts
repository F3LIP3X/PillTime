import { useCallback } from 'react';
import { eq } from 'drizzle-orm';

import { useDb } from '@/db/client';
import { tomas } from '@/db/schema';
import { sincronizarNotificaciones } from '@/features/notificaciones/scheduler';

export function useMarcarToma() {
  const db = useDb();

  const marcarTomado = useCallback(
    async (tomaId: number) => {
      await db
        .update(tomas)
        .set({ estado: 'tomado', fechaHoraRegistrada: new Date().toISOString() })
        .where(eq(tomas.id, tomaId));
      // Una toma resuelta deja de avisar (también si se marca antes de su hora).
      void sincronizarNotificaciones(db);
    },
    [db],
  );

  const marcarOmitido = useCallback(
    async (tomaId: number, motivo?: string) => {
      await db
        .update(tomas)
        .set({
          estado: 'omitido',
          fechaHoraRegistrada: new Date().toISOString(),
          motivoOmision: motivo,
        })
        .where(eq(tomas.id, tomaId));
      // Una toma resuelta deja de avisar (también si se marca antes de su hora).
      void sincronizarNotificaciones(db);
    },
    [db],
  );

  const marcarPendiente = useCallback(
    async (tomaId: number) => {
      await db
        .update(tomas)
        .set({ estado: 'pendiente', fechaHoraRegistrada: null, motivoOmision: null })
        .where(eq(tomas.id, tomaId));
      // Una toma resuelta deja de avisar (también si se marca antes de su hora).
      void sincronizarNotificaciones(db);
    },
    [db],
  );

  return { marcarTomado, marcarOmitido, marcarPendiente };
}
