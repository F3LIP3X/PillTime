import { useCallback, useEffect, useState } from 'react';
import { and, eq, gte, lt } from 'drizzle-orm';

import { useDb } from '@/db/client';
import { medicamentos, tomas, type EstadoToma } from '@/db/schema';

export type TomaDeHoy = {
  id: number;
  medicamentoId: number;
  nombreMedicamento: string;
  dosis: string;
  fechaHoraProgramada: string;
  estado: EstadoToma;
};

function limitesDeHoy() {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 1);
  return { inicio: inicio.toISOString(), fin: fin.toISOString() };
}

export function useTomasDeHoy() {
  const db = useDb();
  const [tomasDeHoy, setTomasDeHoy] = useState<TomaDeHoy[]>([]);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    setCargando(true);
    const { inicio, fin } = limitesDeHoy();

    const filas = await db
      .select({
        id: tomas.id,
        medicamentoId: tomas.medicamentoId,
        nombreMedicamento: medicamentos.nombre,
        dosis: medicamentos.dosis,
        fechaHoraProgramada: tomas.fechaHoraProgramada,
        estado: tomas.estado,
      })
      .from(tomas)
      .innerJoin(medicamentos, eq(medicamentos.id, tomas.medicamentoId))
      .where(
        and(gte(tomas.fechaHoraProgramada, inicio), lt(tomas.fechaHoraProgramada, fin)),
      )
      .orderBy(tomas.fechaHoraProgramada);

    setTomasDeHoy(filas);
    setCargando(false);
  }, [db]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { tomasDeHoy, cargando, recargar };
}
