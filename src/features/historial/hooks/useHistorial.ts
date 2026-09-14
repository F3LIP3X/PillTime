import { useCallback, useEffect, useRef, useState } from 'react';
import { and, desc, eq, lt, lte, ne, or } from 'drizzle-orm';

import { useDb } from '@/db/client';
import { medicamentos, tomas, type EstadoToma } from '@/db/schema';

export type ItemHistorial = {
  id: number;
  nombreMedicamento: string;
  dosis: string;
  fechaHoraProgramada: string;
  estado: EstadoToma;
  motivoOmision: string | null;
};

const TAMANO_PAGINA = 150;

/**
 * Historial paginado por cursor (fecha, id), del más reciente hacia atrás.
 *
 * Antes cargaba todas las tomas de golpe: con 3 años de uso (≈ 40.000
 * filas) cada foco copiaba la tabla entera a JS y la agrupaba por día. La
 * SectionList virtualizaba el pintado, pero no la carga. Ahora se traen
 * páginas de TAMANO_PAGINA al llegar al final de la lista.
 *
 * Cursor y no OFFSET: con OFFSET SQLite tiene que recorrer y descartar
 * todas las filas anteriores en cada página, y una toma nueva desplaza
 * las páginas (filas repetidas o saltadas). El `id` desempata tomas a la
 * misma hora exacta.
 */
export function useHistorial() {
  const db = useDb();
  const [historial, setHistorial] = useState<ItemHistorial[]>([]);
  const [hayMas, setHayMas] = useState(true);
  const cargando = useRef(false);
  // Refs para que `recargar` y `cargarMas` sean estables y no disparen efectos.
  const historialRef = useRef<ItemHistorial[]>([]);
  const hayMasRef = useRef(true);

  const consultar = useCallback(
    (cursor: ItemHistorial | null, limite: number) =>
      db
        .select({
          id: tomas.id,
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
            // 'eliminada' es un tombstone (ver schema.ts), nunca debe verse.
            ne(tomas.estado, 'eliminada'),
            cursor
              ? // (fecha, id) < cursor. El `lte` redundante es lo que deja a SQLite
                // saltar al cursor por el índice; con solo el OR recorría el
                // índice desde el principio en cada página, como un OFFSET.
                and(
                  lte(tomas.fechaHoraProgramada, cursor.fechaHoraProgramada),
                  or(lt(tomas.fechaHoraProgramada, cursor.fechaHoraProgramada), lt(tomas.id, cursor.id)),
                )
              : undefined,
          ),
        )
        .orderBy(desc(tomas.fechaHoraProgramada), desc(tomas.id))
        .limit(limite),
    [db],
  );

  const aplicar = (filas: ItemHistorial[], limite: number) => {
    historialRef.current = filas;
    hayMasRef.current = filas.length >= limite;
    setHistorial(filas);
    setHayMas(hayMasRef.current);
  };

  /** Vuelve a leer desde el principio tantas filas como había cargadas (al volver a la pantalla no se pierde el scroll). */
  const recargar = useCallback(async () => {
    const limite = Math.max(TAMANO_PAGINA, historialRef.current.length);
    aplicar(await consultar(null, limite), limite);
  }, [consultar]);

  const cargarMas = useCallback(async () => {
    const actual = historialRef.current;
    if (cargando.current || !hayMasRef.current || actual.length === 0) return;
    cargando.current = true;
    try {
      const pagina = await consultar(actual[actual.length - 1], TAMANO_PAGINA);
      historialRef.current = [...actual, ...pagina];
      hayMasRef.current = pagina.length === TAMANO_PAGINA;
      setHistorial(historialRef.current);
      setHayMas(hayMasRef.current);
    } finally {
      cargando.current = false;
    }
  }, [consultar]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { historial, hayMas, recargar, cargarMas };
}
