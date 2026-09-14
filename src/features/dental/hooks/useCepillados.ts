import { useCallback, useEffect, useState } from 'react';
import { desc, eq, gte } from 'drizzle-orm';

import { useDb } from '@/db/client';
import { cepillados } from '@/db/schema';

/** Días hacia atrás que se leen: cubren el calendario (5 semanas) y la racha habitual. */
const DIAS_LEIDOS = 90;

export function useCepillados() {
  const db = useDb();
  const [registros, setRegistros] = useState<(typeof cepillados.$inferSelect)[]>([]);

  const recargar = useCallback(async () => {
    const desde = new Date();
    desde.setDate(desde.getDate() - DIAS_LEIDOS);
    setRegistros(
      await db.select().from(cepillados).where(gte(cepillados.fechaHora, desde.toISOString())).orderBy(desc(cepillados.fechaHora)),
    );
  }, [db]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const registrar = useCallback(
    async (fechaHora: Date, duracionSegundos: number) => {
      await db.insert(cepillados).values({ fechaHora: fechaHora.toISOString(), duracionSegundos });
      await recargar();
    },
    [db, recargar],
  );

  const eliminar = useCallback(
    async (id: number) => {
      await db.delete(cepillados).where(eq(cepillados.id, id));
      await recargar();
    },
    [db, recargar],
  );

  return { registros, registrar, eliminar, recargar };
}
