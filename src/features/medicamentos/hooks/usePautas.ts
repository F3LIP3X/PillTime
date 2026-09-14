import { useCallback } from 'react';
import { and, eq, gte } from 'drizzle-orm';

import { useDb, type Db } from '@/db/client';
import { horariosMedicamento, tomas } from '@/db/schema';
import { sincronizarNotificaciones } from '@/features/notificaciones/scheduler';
import { claveDia } from '@/features/tomas/ocurrencias';
import { fechasTratamiento, horaTexto, type EstadoPauta } from '../pauta';

/**
 * Crear, cambiar y quitar pautas.
 *
 * Regla común: un cambio de pauta vale DESDE AHORA. Las tomas pendientes
 * futuras de esa pauta se borran (físicamente: son filas que generó la
 * propia pauta, no tomas que el usuario eliminara, así que no hace falta
 * tumba) y las pasadas se quedan como estén, marcadas o no.
 */

function columnasDePauta(p: EstadoPauta) {
  if (p.modo === 'semanal') {
    return {
      tipo: 'semanal' as const,
      hora: horaTexto(p.hora),
      diasSemana: [...p.dias].sort().join(','),
      // Vigente desde ahora: ni tomas ni avisos de horas ya pasadas (ver schema.ts).
      fechaHoraInicio: new Date().toISOString(),
      fechaFin: p.duracion === 'hasta' ? claveDia(p.fechaFin) : null,
      frecuenciaHoras: null,
      duracionDias: null,
    };
  }
  const inicio = new Date(p.inicio);
  // Sin segundos: si no, la primera toma queda "Atrasada" al instante.
  inicio.setSeconds(0, 0);
  return {
    tipo: 'intervalo' as const,
    hora: null,
    diasSemana: null,
    fechaHoraInicio: inicio.toISOString(),
    fechaFin: null,
    frecuenciaHoras: Number(p.frecuenciaHoras),
    duracionDias: Number(p.duracionDias),
  };
}

async function borrarPendientesFuturas(db: Db, horarioId: number) {
  await db
    .delete(tomas)
    .where(
      and(
        eq(tomas.horarioId, horarioId),
        eq(tomas.estado, 'pendiente'),
        gte(tomas.fechaHoraProgramada, new Date().toISOString()),
      ),
    );
}

/**
 * Un tratamiento por intervalo tiene fin conocido, así que sus tomas se
 * crean todas de golpe (las semanales se materializan día a día, ver
 * useAsegurarTomasDeHoy). Al cambiar la pauta solo se crean las que aún
 * no han pasado; `onConflictDoNothing` respeta las que ya existan en el
 * mismo instante (p. ej. una ya marcada como tomada).
 */
async function generarTomasIntervalo(db: Db, medicamentoId: number, horarioId: number, desde?: Date) {
  const [horario] = await db.select().from(horariosMedicamento).where(eq(horariosMedicamento.id, horarioId));
  if (!horario || horario.tipo !== 'intervalo') return;

  const fechas = fechasTratamiento(
    new Date(horario.fechaHoraInicio!),
    horario.frecuenciaHoras!,
    horario.duracionDias!,
  ).filter((f) => !desde || f >= desde.toISOString());
  if (fechas.length === 0) return;

  await db
    .insert(tomas)
    .values(fechas.map((fechaHoraProgramada) => ({ medicamentoId, horarioId, fechaHoraProgramada, estado: 'pendiente' as const })))
    .onConflictDoNothing();
}

export function useCrearPauta() {
  const db = useDb();

  return useCallback(
    async (medicamentoId: number, pauta: EstadoPauta) => {
      const [horario] = await db
        .insert(horariosMedicamento)
        .values({ medicamentoId, ...columnasDePauta(pauta) })
        .returning();
      await generarTomasIntervalo(db, medicamentoId, horario.id);
      void sincronizarNotificaciones(db);
      return horario;
    },
    [db],
  );
}

/** El tipo de una pauta no se cambia al editar: para eso se quita y se añade otra. */
export function useActualizarPauta() {
  const db = useDb();

  return useCallback(
    async (horarioId: number, medicamentoId: number, pauta: EstadoPauta) => {
      const ahora = new Date();
      await db.update(horariosMedicamento).set(columnasDePauta(pauta)).where(eq(horariosMedicamento.id, horarioId));
      await borrarPendientesFuturas(db, horarioId);
      await generarTomasIntervalo(db, medicamentoId, horarioId, ahora);
      void sincronizarNotificaciones(db);
    },
    [db],
  );
}

/**
 * Quitar una pauta la desactiva (`activo = false`) en vez de borrarla: sus
 * tomas pasadas siguen apuntando a ella y conservan su franja horaria en
 * el historial y en el cumplimiento por franja.
 */
export function useQuitarPauta() {
  const db = useDb();

  return useCallback(
    async (horarioId: number) => {
      await db.update(horariosMedicamento).set({ activo: false }).where(eq(horariosMedicamento.id, horarioId));
      await borrarPendientesFuturas(db, horarioId);
      void sincronizarNotificaciones(db);
    },
    [db],
  );
}
