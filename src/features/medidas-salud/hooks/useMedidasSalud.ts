import { useCallback, useEffect, useState } from 'react';
import { asc, desc, eq, gte } from 'drizzle-orm';

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

export function useMedidasSalud(tipo: TipoMedidaSalud) {
  const db = useDb();
  const [medidas, setMedidas] = useState<Medida[]>([]);

  const recargar = useCallback(async () => {
    const filas = await db
      .select()
      .from(medidasSalud)
      .where(eq(medidasSalud.tipo, tipo))
      .orderBy(desc(medidasSalud.fechaHora));
    setMedidas(filas);
  }, [db, tipo]);

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

  return { medidas, registrar, actualizar, eliminar, recargar };
}

/** Todas las medidas (de todos los tipos) desde una fecha, en orden cronológico, para Gráficas. */
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
