import { useCallback, useEffect, useRef, useState } from 'react';
import { and, asc, desc, eq, gte, lt, lte, or } from 'drizzle-orm';

import { useDb } from '@/db/client';
import { medidasSalud, type TipoMedidaSalud } from '@/db/schema';
import type { Medida } from '../tipos';

export type DatosMedida = {
  valor1: number | null;
  valor2: number | null;
  valor3: number | null;
  notas: string | null;
  fechaHora: string;
};

const TAMANO_PAGINA = 60;

/**
 * Registros de un tipo, del más reciente hacia atrás, paginados por cursor
 * (fecha, id) sobre el índice medidas_tipo_fecha. Mismo patrón que
 * useHistorial: nunca se carga el histórico entero de golpe.
 */
export function useMedidasSalud(tipo: TipoMedidaSalud) {
  const db = useDb();
  const [medidas, setMedidas] = useState<Medida[]>([]);
  const medidasRef = useRef<Medida[]>([]);
  const hayMasRef = useRef(true);
  const cargando = useRef(false);

  const consultar = useCallback(
    (cursor: Medida | null, limite: number) =>
      db
        .select()
        .from(medidasSalud)
        .where(
          and(
            eq(medidasSalud.tipo, tipo),
            cursor
              ? // (fecha, id) < cursor. El `lte` redundante es lo que deja a SQLite
                // saltar al cursor por el índice; con solo el OR recorría el
                // índice desde el principio en cada página, como un OFFSET.
                and(
                  lte(medidasSalud.fechaHora, cursor.fechaHora),
                  or(lt(medidasSalud.fechaHora, cursor.fechaHora), lt(medidasSalud.id, cursor.id)),
                )
              : undefined,
          ),
        )
        .orderBy(desc(medidasSalud.fechaHora), desc(medidasSalud.id))
        .limit(limite),
    [db, tipo],
  );

  const recargar = useCallback(async () => {
    // Al cambiar de tipo, la ref aún tiene los del tipo anterior: solo se
    // conserva el tamaño cargado si siguen siendo del mismo tipo.
    const mismoTipo = medidasRef.current[0]?.tipo === tipo;
    const limite = Math.max(TAMANO_PAGINA, mismoTipo ? medidasRef.current.length : 0);
    const filas = await consultar(null, limite);
    medidasRef.current = filas;
    hayMasRef.current = filas.length >= limite;
    setMedidas(filas);
  }, [consultar, tipo]);

  const cargarMas = useCallback(async () => {
    const actual = medidasRef.current;
    if (cargando.current || !hayMasRef.current || actual.length === 0) return;
    cargando.current = true;
    try {
      const pagina = await consultar(actual[actual.length - 1], TAMANO_PAGINA);
      medidasRef.current = [...actual, ...pagina];
      hayMasRef.current = pagina.length === TAMANO_PAGINA;
      setMedidas(medidasRef.current);
    } finally {
      cargando.current = false;
    }
  }, [consultar]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const registrar = useCallback(
    async (datos: DatosMedida) => {
      await db.insert(medidasSalud).values({ tipo, ...datos });
      await recargar();
    },
    [db, tipo, recargar],
  );

  const actualizar = useCallback(
    async (id: number, datos: DatosMedida) => {
      await db.update(medidasSalud).set(datos).where(eq(medidasSalud.id, id));
      await recargar();
    },
    [db, recargar],
  );

  const eliminar = useCallback(
    async (id: number) => {
      await db.delete(medidasSalud).where(eq(medidasSalud.id, id));
      await recargar();
    },
    [db, recargar],
  );

  return { medidas, registrar, actualizar, eliminar, recargar, cargarMas };
}

/**
 * Todas las medidas (de todos los tipos) desde una fecha, en orden
 * cronológico, para Gráficas. Acotado por el periodo elegido (máximo un
 * año) sobre el índice medidas_fecha: no es el histórico completo.
 */
export function useMedidasDesde(desde: Date) {
  const db = useDb();
  const [medidas, setMedidas] = useState<Medida[]>([]);
  const desdeIso = desde.toISOString();

  const recargar = useCallback(async () => {
    const filas = await db
      .select()
      .from(medidasSalud)
      .where(gte(medidasSalud.fechaHora, desdeIso))
      .orderBy(asc(medidasSalud.fechaHora));
    setMedidas(filas);
  }, [db, desdeIso]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { medidas, recargar };
}
