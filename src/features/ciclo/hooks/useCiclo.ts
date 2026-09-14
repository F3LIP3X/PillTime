import { useCallback, useEffect, useMemo, useState } from 'react';
import { and, eq, gte, lte } from 'drizzle-orm';

import { useDb } from '@/db/client';
import { periodos, registrosCiclo } from '@/db/schema';
import { sincronizarNotificaciones } from '@/features/notificaciones/scheduler';
import { claveDia } from '@/features/tomas/ocurrencias';
import { usePreferenciasStore } from '@/stores/preferenciasStore';
import { analizar, type Periodo } from '../prediccion';
import { planInicio, validarFin } from '../reglas';

/** Reglas registradas (tabla pequeña: unas 13 filas por año) y el análisis del ciclo. */
export function useCiclo() {
  const db = useDb();
  const [lista, setLista] = useState<Periodo[]>([]);
  const [cargado, setCargado] = useState(false);

  const recargar = useCallback(async () => {
    setLista(await db.select({ id: periodos.id, fechaInicio: periodos.fechaInicio, fechaFin: periodos.fechaFin }).from(periodos));
    setCargado(true);
  }, [db]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const hoy = claveDia(new Date());
  // Suscrito al flag: activar o desactivar SOP recalcula al momento.
  const sop = usePreferenciasStore((s) => s.sop);
  const analisis = useMemo(() => analizar(lista, hoy, { sop }), [lista, hoy, sop]);

  const tras = useCallback(async () => {
    await recargar();
    // La fecha estimada de la próxima regla cambia: hay que reprogramar su aviso.
    void sincronizarNotificaciones(db);
  }, [db, recargar]);

  /** Devuelve un mensaje de error para mostrar, o null si se guardó. */
  const registrarInicio = useCallback(
    async (fecha: string): Promise<string | null> => {
      const plan = planInicio(lista, fecha, claveDia(new Date()), analisis.mediaRegla);
      if ('error' in plan) return plan.error;
      if (plan.cerrar) await db.update(periodos).set({ fechaFin: plan.cerrar.fechaFin }).where(eq(periodos.id, plan.cerrar.id));
      await db.insert(periodos).values(plan.insertar);
      await tras();
      return null;
    },
    [db, lista, analisis.mediaRegla, tras],
  );

  const registrarFin = useCallback(
    async (periodo: Periodo, fecha: string): Promise<string | null> => {
      const error = validarFin(lista, periodo, fecha, claveDia(new Date()));
      if (error) return error;
      await db.update(periodos).set({ fechaFin: fecha }).where(eq(periodos.id, periodo.id));
      await tras();
      return null;
    },
    [db, lista, tras],
  );

  const eliminarPeriodo = useCallback(
    async (id: number) => {
      await db.delete(periodos).where(eq(periodos.id, id));
      await tras();
    },
    [db, tras],
  );

  return { periodos: lista, analisis, hoy, cargado, recargar, registrarInicio, registrarFin, eliminarPeriodo };
}

export type RegistroCiclo = typeof registrosCiclo.$inferSelect;
export type DatosRegistroCiclo = Pick<RegistroCiclo, 'flujo' | 'dolor' | 'animo' | 'energia' | 'sintomas' | 'notas'>;

/** Registros de síntomas entre dos días (el calendario pide un mes cada vez). */
export function useRegistrosCiclo(desde: string, hasta: string) {
  const db = useDb();
  const [registros, setRegistros] = useState<Map<string, RegistroCiclo>>(new Map());

  const recargar = useCallback(async () => {
    const filas = await db
      .select()
      .from(registrosCiclo)
      .where(and(gte(registrosCiclo.fecha, desde), lte(registrosCiclo.fecha, hasta)));
    setRegistros(new Map(filas.map((f) => [f.fecha, f])));
  }, [db, desde, hasta]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  /** Guarda (o borra, si no queda nada marcado) el registro de un día. */
  const guardar = useCallback(
    async (fecha: string, datos: DatosRegistroCiclo) => {
      const vacio = Object.values(datos).every((v) => v === null || v === '');
      if (vacio) {
        await db.delete(registrosCiclo).where(eq(registrosCiclo.fecha, fecha));
      } else {
        await db
          .insert(registrosCiclo)
          .values({ fecha, ...datos })
          .onConflictDoUpdate({ target: registrosCiclo.fecha, set: { ...datos, updatedAt: new Date().toISOString() } });
      }
      await recargar();
    },
    [db, recargar],
  );

  return { registros, guardar, recargar };
}
