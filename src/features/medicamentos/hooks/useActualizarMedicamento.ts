import { useCallback } from 'react';
import { and, eq, gte, inArray } from 'drizzle-orm';

import { useDb, type Db } from '@/db/client';
import { horariosMedicamento, medicamentos, tomas } from '@/db/schema';
import { sincronizarNotificaciones } from '@/features/notificaciones/scheduler';
import type { DatosMedicamento } from '../formulario';
import { pautaTerminada } from '../pauta';
import { aprenderCodigoBarras } from './useCrearMedicamento';

export function useActualizarMedicamento() {
  const db = useDb();

  return useCallback(
    async (id: number, datos: DatosMedicamento) => {
      await db.update(medicamentos).set(datos).where(eq(medicamentos.id, id));
      // Corregir nombre/dosis también corrige lo aprendido para ese código.
      await aprenderCodigoBarras(db, datos);
      // El texto del aviso lleva nombre, dosis y momento de la comida.
      void sincronizarNotificaciones(db);
    },
    [db],
  );
}

async function borrarPendientesFuturasDelMedicamento(db: Db, medicamentoId: number, desde: Date) {
  await db
    .delete(tomas)
    .where(
      and(
        eq(tomas.medicamentoId, medicamentoId),
        eq(tomas.estado, 'pendiente'),
        gte(tomas.fechaHoraProgramada, desde.toISOString()),
      ),
    );
}

/**
 * Pasar a "Terminados" a mano. Sus pautas se conservan tal cual (el
 * detalle enseña qué pauta tenía) y se borran solo las tomas pendientes
 * que aún no han llegado; lo pasado queda en el historial.
 */
export function useTerminarMedicamento() {
  const db = useDb();

  return useCallback(
    async (id: number) => {
      await db.update(medicamentos).set({ activo: false }).where(eq(medicamentos.id, id));
      await borrarPendientesFuturasDelMedicamento(db, id, new Date());
      void sincronizarNotificaciones(db);
    },
    [db],
  );
}

/**
 * Volver a "Activos". Las pautas antiguas se desactivan: ya terminaron, y
 * si siguieran activas la terminación automática lo devolvería a
 * Terminados en la siguiente apertura de Inicio. Tras reactivar hay que
 * añadir una pauta nueva (la pantalla lleva a Editar para eso).
 */
export function useReactivarMedicamento() {
  const db = useDb();

  return useCallback(
    async (id: number) => {
      await db.update(medicamentos).set({ activo: true }).where(eq(medicamentos.id, id));
      await db.update(horariosMedicamento).set({ activo: false }).where(eq(horariosMedicamento.medicamentoId, id));
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      await borrarPendientesFuturasDelMedicamento(db, id, hoy);
      void sincronizarNotificaciones(db);
    },
    [db],
  );
}

/**
 * Borrado DEFINITIVO: el medicamento, sus pautas y todo su historial de
 * tomas. Distinto de terminar. Los borrados de tomas y pautas son
 * explícitos a propósito: el `onDelete: 'cascade'` del esquema depende de
 * `PRAGMA foreign_keys`, que expo-sqlite no activa en la conexión de las
 * pantallas, así que no se puede confiar en él.
 *
 * `codigos_barras_aprendidos` no se toca: es una caché de aprendizaje
 * independiente, útil aunque el medicamento ya no exista.
 */
export function useEliminarMedicamento() {
  const db = useDb();

  return useCallback(
    async (id: number) => {
      await db.delete(tomas).where(eq(tomas.medicamentoId, id));
      await db.delete(horariosMedicamento).where(eq(horariosMedicamento.medicamentoId, id));
      await db.delete(medicamentos).where(eq(medicamentos.id, id));
      void sincronizarNotificaciones(db);
    },
    [db],
  );
}

/**
 * Pasa a Terminados los medicamentos activos cuyas pautas activas han
 * terminado TODAS (ver `pautaTerminada`). Uno sin pautas activas no se
 * toca: acaba de reactivarse o nunca tuvo pauta, y no hay fin que esperar.
 */
export async function terminarTratamientosFinalizados(db: Db) {
  const filas = await db
    .select({ horario: horariosMedicamento })
    .from(horariosMedicamento)
    .innerJoin(medicamentos, eq(medicamentos.id, horariosMedicamento.medicamentoId))
    .where(and(eq(medicamentos.activo, true), eq(horariosMedicamento.activo, true)));

  const porMedicamento = new Map<number, boolean>();
  for (const { horario } of filas) {
    const terminadoHastaAhora = porMedicamento.get(horario.medicamentoId) ?? true;
    porMedicamento.set(horario.medicamentoId, terminadoHastaAhora && pautaTerminada(horario));
  }

  const terminados = [...porMedicamento].filter(([, terminado]) => terminado).map(([id]) => id);
  if (terminados.length === 0) return 0;

  await db.update(medicamentos).set({ activo: false }).where(inArray(medicamentos.id, terminados));
  void sincronizarNotificaciones(db);
  return terminados.length;
}
