import { useCallback, useEffect, useState } from 'react';
import { eq, isNotNull, sql } from 'drizzle-orm';

import { useDb } from '@/db/client';
import { horariosMedicamento, tomas } from '@/db/schema';

export type CumplimientoFranja = {
  horarioId: number;
  hora: string;
  totalProgramadas: number;
  totalTomadas: number;
  porcentaje: number;
};

/**
 * % de cumplimiento agrupado por franja horaria (horarioId).
 *
 * DECISIÓN: excluye explícitamente las tomas con horarioId = null
 * (tomas puntuales/manuales, ver comentario en schema.ts sobre
 * `tomas.horarioId`) porque no tienen una franja a la que atribuirse.
 * Esas tomas SÍ deben contarse en un futuro "cumplimiento global", pero
 * NO en este informe por franja — no es un olvido, es a propósito.
 */
export function useCumplimientoPorFranja() {
  const db = useDb();
  const [datos, setDatos] = useState<CumplimientoFranja[]>([]);

  const recargar = useCallback(async () => {
    const tomadas = sql<number>`sum(case when ${tomas.estado} = 'tomado' then 1 else 0 end)`;
    const total = sql<number>`count(${tomas.id})`;

    const filas = await db
      .select({
        horarioId: horariosMedicamento.id,
        hora: horariosMedicamento.hora,
        totalProgramadas: total,
        totalTomadas: tomadas,
      })
      .from(tomas)
      .innerJoin(horariosMedicamento, eq(horariosMedicamento.id, tomas.horarioId))
      // Redundante con el INNER JOIN (que ya excluye horarioId null), pero
      // explícito a propósito: que la exclusión sea visible en el código,
      // no solo una consecuencia implícita del tipo de join.
      .where(isNotNull(tomas.horarioId))
      .groupBy(horariosMedicamento.id);

    setDatos(
      filas.map((f) => ({
        ...f,
        porcentaje: f.totalProgramadas === 0 ? 0 : Math.round((f.totalTomadas / f.totalProgramadas) * 100),
      })),
    );
  }, [db]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { cumplimiento: datos, recargar };
}
