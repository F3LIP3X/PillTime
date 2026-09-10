import { useCallback } from 'react';
import { sql } from 'drizzle-orm';

import { useDb } from '@/db/client';
import { codigosBarrasAprendidos, medicamentos, type MomentoComida } from '@/db/schema';

export type NuevoMedicamento = {
  nombre: string;
  dosis: string;
  unidadesPorToma: number;
  stockInicial: number;
  momentoComida?: MomentoComida;
  codigoBarras?: string;
  notas?: string;
};

export function useCrearMedicamento() {
  const db = useDb();

  return useCallback(
    async (datos: NuevoMedicamento) => {
      const [medicamento] = await db.insert(medicamentos).values(datos).returning();

      // Aprendizaje reutilizable: si el alta vino de un código de barras,
      // se guarda/actualiza para autocompletar la próxima vez que se escanee.
      if (datos.codigoBarras) {
        await db
          .insert(codigosBarrasAprendidos)
          .values({
            codigoBarras: datos.codigoBarras,
            nombre: datos.nombre,
            dosis: datos.dosis,
            notas: datos.notas,
          })
          .onConflictDoUpdate({
            target: codigosBarrasAprendidos.codigoBarras,
            set: {
              nombre: datos.nombre,
              dosis: datos.dosis,
              notas: datos.notas,
              updatedAt: sql`(current_timestamp)`,
            },
          });
      }

      return medicamento;
    },
    [db],
  );
}
