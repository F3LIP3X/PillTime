import { useCallback, useEffect, useState } from 'react';
import { desc, eq } from 'drizzle-orm';

import { useDb } from '@/db/client';
import { medidasSalud, type TipoMedidaSalud } from '@/db/schema';

export function useMedidasSalud(tipo: TipoMedidaSalud) {
  const db = useDb();
  const [medidas, setMedidas] = useState<(typeof medidasSalud.$inferSelect)[]>([]);

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
    async (datos: { valor1?: number; valor2?: number; unidad?: string; notas?: string; fechaHora: string }) => {
      await db.insert(medidasSalud).values({ tipo, ...datos });
      await recargar();
    },
    [db, tipo, recargar],
  );

  const actualizar = useCallback(
    async (id: number, datos: { valor1?: number; valor2?: number; notas?: string; fechaHora: string }) => {
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
