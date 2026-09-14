import { useCallback, useEffect, useState } from 'react';
import { and, asc, count, eq, gte, lt, lte, ne, or } from 'drizzle-orm';

import { useDb } from '@/db/client';
import { medicamentos, tomas, type EstadoToma } from '@/db/schema';
import { cargarOcurrencias } from '@/features/tomas/cargarOcurrencias';
import { finDelDia, inicioDelDia, MS_DIA, type Ocurrencia } from '@/features/tomas/ocurrencias';

export type TomaDeHoy = {
  id: number;
  medicamentoId: number;
  nombreMedicamento: string;
  dosis: string;
  fechaHoraProgramada: string;
  estado: EstadoToma;
  motivoOmision: string | null;
};

/**
 * La agenda de Inicio: TODAS las tomas de hoy por hora, resueltas o no.
 *
 * Decisión del usuario (14-09-2026), tras el feedback de beta testers,
 * que sustituye a la anterior "una tarjeta por medicamento con su próxima
 * toma": las hechas se quedan en la lista marcadas en vez de desaparecer
 * (desaparecer hacía dudar de si se habían guardado) y no se muestran
 * días anteriores ni posteriores.
 *
 * Además devuelve:
 * - `pendientesAnteriores`: tomas sin marcar de días pasados, para
 *   avisar de que existen (se resuelven desde Historial) sin mezclarlas
 *   con las de hoy.
 * - `siguiente`: la primera toma prevista después de hoy, para el estado
 *   "todo hecho" ("Mañana a las 9:00").
 *
 * Las tomas pendientes de un medicamento terminado no salen; las ya
 * resueltas sí, porque son lo que el usuario hizo hoy.
 */
export function useTomasDeHoy() {
  const db = useDb();
  const [tomasDeHoy, setTomasDeHoy] = useState<TomaDeHoy[]>([]);
  const [pendientesAnteriores, setPendientesAnteriores] = useState(0);
  const [siguiente, setSiguiente] = useState<Ocurrencia | null>(null);

  const recargar = useCallback(async () => {
    const ahora = new Date();
    const inicio = inicioDelDia(ahora).toISOString();
    const fin = finDelDia(ahora);

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
      .where(
        and(
          gte(tomas.fechaHoraProgramada, inicio),
          lte(tomas.fechaHoraProgramada, fin.toISOString()),
          ne(tomas.estado, 'eliminada'),
          or(eq(medicamentos.activo, true), ne(tomas.estado, 'pendiente')),
        ),
      )
      .orderBy(asc(tomas.fechaHoraProgramada), asc(medicamentos.nombre));

    const [{ total }] = await db
      .select({ total: count() })
      .from(tomas)
      .innerJoin(medicamentos, eq(medicamentos.id, tomas.medicamentoId))
      .where(and(eq(tomas.estado, 'pendiente'), eq(medicamentos.activo, true), lt(tomas.fechaHoraProgramada, inicio)));

    const futuras = await cargarOcurrencias(db, new Date(fin.getTime() + 1), new Date(fin.getTime() + 7 * MS_DIA));

    setTomasDeHoy(filas);
    setPendientesAnteriores(total);
    setSiguiente(futuras[0] ?? null);
  }, [db]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { tomasDeHoy, pendientesAnteriores, siguiente, recargar };
}
