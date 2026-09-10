import { useCallback, useEffect, useState } from 'react';
import { asc, gte } from 'drizzle-orm';

import { useDb } from '@/db/client';
import { citasMedicas } from '@/db/schema';

export function useCitasProximas() {
  const db = useDb();
  const [citas, setCitas] = useState<(typeof citasMedicas.$inferSelect)[]>([]);

  const recargar = useCallback(async () => {
    const filas = await db
      .select()
      .from(citasMedicas)
      .where(gte(citasMedicas.fechaHora, new Date().toISOString()))
      .orderBy(asc(citasMedicas.fechaHora));
    setCitas(filas);
  }, [db]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const crear = useCallback(
    async (datos: { titulo: string; lugar?: string; fechaHora: string; notas?: string }) => {
      await db.insert(citasMedicas).values(datos);
      await recargar();
    },
    [db, recargar],
  );

  return { citas, crear, recargar };
}
