import { useCallback, useEffect, useState } from 'react';
import { eq, sql } from 'drizzle-orm';

import { useDb } from '@/db/client';
import { medicamentos, tomas } from '@/db/schema';

export type MedicamentoConStock = {
  id: number;
  nombre: string;
  dosis: string;
  stockInicial: number;
  unidadesPorToma: number;
  /** stockInicial − (tomas 'tomado' × unidadesPorToma). No depende de horarioId: cuenta toda toma marcada como tomada, tenga o no horario asociado. */
  stockRestante: number;
  activo: boolean;
  fechaCaducidad: string | null;
};

export function useMedicamentos(opciones: { soloActivos?: boolean } = {}) {
  const { soloActivos = true } = opciones;
  const db = useDb();
  const [medicamentosData, setMedicamentosData] = useState<MedicamentoConStock[]>([]);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    setCargando(true);
    const tomadas = sql<number>`coalesce(sum(case when ${tomas.estado} = 'tomado' then 1 else 0 end), 0)`;

    const filas = await db
      .select({
        id: medicamentos.id,
        nombre: medicamentos.nombre,
        dosis: medicamentos.dosis,
        stockInicial: medicamentos.stockInicial,
        unidadesPorToma: medicamentos.unidadesPorToma,
        activo: medicamentos.activo,
        fechaCaducidad: medicamentos.fechaCaducidad,
        tomasRegistradas: tomadas,
      })
      .from(medicamentos)
      .leftJoin(tomas, eq(tomas.medicamentoId, medicamentos.id))
      .where(soloActivos ? eq(medicamentos.activo, true) : undefined)
      .groupBy(medicamentos.id)
      .orderBy(medicamentos.nombre);

    setMedicamentosData(
      filas.map((fila) => ({
        ...fila,
        stockRestante: fila.stockInicial - fila.tomasRegistradas * fila.unidadesPorToma,
      })),
    );
    setCargando(false);
  }, [db, soloActivos]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { medicamentos: medicamentosData, cargando, recargar };
}
