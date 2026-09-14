import { useCallback } from 'react';
import { eq } from 'drizzle-orm';

import { useDb } from '@/db/client';
import { medicamentos, type MomentoComida } from '@/db/schema';
import { sincronizarNotificaciones } from '@/features/notificaciones/scheduler';

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
      // El texto del aviso lleva nombre, dosis y momento de la comida.
      void sincronizarNotificaciones(db);
    },
    [db],
  );
}

export function useArchivarMedicamento() {
  const db = useDb();

  return useCallback(
    async (id: number) => {
      await db.update(medicamentos).set({ activo: false }).where(eq(medicamentos.id, id));
      void sincronizarNotificaciones(db);
    },
    [db],
  );
}
