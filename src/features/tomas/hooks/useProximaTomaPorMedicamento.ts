import { useCallback, useEffect, useState } from 'react';
import { and, asc, eq } from 'drizzle-orm';

import { useDb } from '@/db/client';
import { medicamentos, tomas, type EstadoToma } from '@/db/schema';

export type ProximaToma = {
  id: number;
  medicamentoId: number;
  nombreMedicamento: string;
  dosis: string;
  fechaHoraProgramada: string;
  estado: EstadoToma;
  motivoOmision: string | null;
};

/**
 * Una fila por medicamento: su toma 'pendiente' más próxima en el tiempo
 * (la más antigua sin resolver, incluida una atrasada de un día anterior
 * si no se marcó — así el backlog queda visible en vez de desaparecer).
 * No se limita a "hoy": si un tratamiento por intervalo tiene su próxima
 * dosis mañana, se muestra igual, porque es la próxima pendiente de ese
 * medicamento.
 *
 * SQLite no hace "greatest-n-per-group" cómodamente sin funciones de
 * ventana; con el volumen de datos de un uso doméstico normal es más
 * simple y suficientemente rápido traer todas las pendientes ordenadas
 * y quedarse con la primera por medicamentoId en JS.
 */
export function useProximaTomaPorMedicamento() {
  const db = useDb();
  const [proximas, setProximas] = useState<ProximaToma[]>([]);

  const recargar = useCallback(async () => {
    const filas = await db
      .select({
        id: tomas.id,
        medicamentoId: tomas.medicamentoId,
        nombreMedicamento: medicamentos.nombre,
        dosis: medicamentos.dosis,
        fechaHoraProgramada: tomas.fechaHoraProgramada,
        estado: tomas.estado,
        motivoOmision: tomas.motivoOmision,
      })
      .from(tomas)
      .innerJoin(medicamentos, eq(medicamentos.id, tomas.medicamentoId))
      .where(and(eq(tomas.estado, 'pendiente'), eq(medicamentos.activo, true)))
      .orderBy(asc(tomas.fechaHoraProgramada));

    const primeraPorMedicamento = new Map<number, ProximaToma>();
    for (const fila of filas) {
      if (!primeraPorMedicamento.has(fila.medicamentoId)) {
        primeraPorMedicamento.set(fila.medicamentoId, fila);
      }
    }

    setProximas(
      Array.from(primeraPorMedicamento.values()).sort(
        (a, b) => a.fechaHoraProgramada.localeCompare(b.fechaHoraProgramada),
      ),
    );
  }, [db]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { proximas, recargar };
}
