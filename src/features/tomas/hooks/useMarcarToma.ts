import { useCallback } from 'react';
import { eq } from 'drizzle-orm';

import { useDb } from '@/db/client';
import { tomas } from '@/db/schema';

export function useMarcarToma() {
  const db = useDb();

  const marcarTomado = useCallback(
    async (tomaId: number) => {
      await db
        .update(tomas)
        .set({ estado: 'tomado', fechaHoraRegistrada: new Date().toISOString() })
        .where(eq(tomas.id, tomaId));
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
    },
    [db],
  );

  return { marcarTomado, marcarOmitido };
}
