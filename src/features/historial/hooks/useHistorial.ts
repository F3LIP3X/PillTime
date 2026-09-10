import { useCallback, useEffect, useState } from 'react';
import { desc, eq, ne } from 'drizzle-orm';

import { useDb } from '@/db/client';
import { medicamentos, tomas, type EstadoToma } from '@/db/schema';

export type ItemHistorial = {
  id: number;
  nombreMedicamento: string;
  fechaHoraProgramada: string;
  estado: EstadoToma;
  motivoOmision: string | null;
};

export function useHistorial() {
  const db = useDb();
  const [historial, setHistorial] = useState<ItemHistorial[]>([]);

  const recargar = useCallback(async () => {
    const filas = await db
      .select({
        id: tomas.id,
        nombreMedicamento: medicamentos.nombre,
        fechaHoraProgramada: tomas.fechaHoraProgramada,
        estado: tomas.estado,
        motivoOmision: tomas.motivoOmision,
      })
      .from(tomas)
      .innerJoin(medicamentos, eq(medicamentos.id, tomas.medicamentoId))
      // 'eliminada' es un tombstone (ver schema.ts), nunca debe verse.
      .where(ne(tomas.estado, 'eliminada'))
      .orderBy(desc(tomas.fechaHoraProgramada));
    setHistorial(filas);
  }, [db]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { historial, recargar };
}
