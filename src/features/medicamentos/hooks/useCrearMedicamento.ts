import { useCallback } from 'react';
import { sql } from 'drizzle-orm';

import { useDb, type Db } from '@/db/client';
import { codigosBarrasAprendidos, medicamentos } from '@/db/schema';
import type { DatosMedicamento } from '../formulario';

/**
 * Aprendizaje reutilizable: si el medicamento tiene código de barras, se
 * guarda/actualiza nombre y dosis para autocompletar el próximo escaneo.
 */
export async function aprenderCodigoBarras(db: Db, datos: DatosMedicamento) {
  if (!datos.codigoBarras) return;
  await db
    .insert(codigosBarrasAprendidos)
    .values({ codigoBarras: datos.codigoBarras, nombre: datos.nombre, dosis: datos.dosis, notas: datos.notas })
    .onConflictDoUpdate({
      target: codigosBarrasAprendidos.codigoBarras,
      set: { nombre: datos.nombre, dosis: datos.dosis, notas: datos.notas, updatedAt: sql`(current_timestamp)` },
    });
}

export function useCrearMedicamento() {
  const db = useDb();

  return useCallback(
    async (datos: DatosMedicamento) => {
      const [medicamento] = await db.insert(medicamentos).values(datos).returning();
      await aprenderCodigoBarras(db, datos);
      return medicamento;
    },
    [db],
  );
}
