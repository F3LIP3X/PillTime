import { useCallback } from 'react';
import { eq } from 'drizzle-orm';

import { useDb } from '@/db/client';
import { medicamentos, type MomentoComida } from '@/db/schema';

export type DatosMedicamento = {
  nombre: string;
  dosis: string;
  unidadesPorToma: number;
  stockInicial: number;
  momentoComida?: MomentoComida;
  notas?: string;
};

export function useActualizarMedicamento() {
  const db = useDb();

  return useCallback(
    async (id: number, datos: DatosMedicamento) => {
      await db.update(medicamentos).set(datos).where(eq(medicamentos.id, id));
    },
    [db],
  );
}

export function useArchivarMedicamento() {
  const db = useDb();

  return useCallback(
    async (id: number) => {
      await db.update(medicamentos).set({ activo: false }).where(eq(medicamentos.id, id));
    },
    [db],
  );
}
