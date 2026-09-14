import { and, eq, gte, lte } from 'drizzle-orm';

import type { Db } from '@/db/client';
import { horariosMedicamento, medicamentos, tomas } from '@/db/schema';
import { calcularOcurrencias, inicioDelDia, MS_DIA, type Ocurrencia } from './ocurrencias';

/**
 * Lee de SQLite lo necesario y delega en `calcularOcurrencias` (puro).
 * Solo cuenta medicamentos activos: uno archivado no genera tomas ni avisos.
 */
export async function cargarOcurrencias(
  db: Db,
  desde: Date,
  hasta: Date,
  opciones: { medicamentoId?: number } = {},
): Promise<Ocurrencia[]> {
  const filtroMedicamento = opciones.medicamentoId
    ? eq(medicamentos.id, opciones.medicamentoId)
    : undefined;

  const horarios = await db
    .select({
      id: horariosMedicamento.id,
      medicamentoId: horariosMedicamento.medicamentoId,
      tipo: horariosMedicamento.tipo,
      hora: horariosMedicamento.hora,
      diasSemana: horariosMedicamento.diasSemana,
      fechaHoraInicio: horariosMedicamento.fechaHoraInicio,
      fechaFin: horariosMedicamento.fechaFin,
      nombreMedicamento: medicamentos.nombre,
      dosis: medicamentos.dosis,
      momentoComida: medicamentos.momentoComida,
    })
    .from(horariosMedicamento)
    .innerJoin(medicamentos, eq(medicamentos.id, horariosMedicamento.medicamentoId))
    .where(and(eq(horariosMedicamento.activo, true), eq(medicamentos.activo, true), filtroMedicamento));

  // Un día de margen a cada lado: las filas se emparejan con su pauta por
  // día local, y una toma editada puede haberse movido unas horas.
  const filas = await db
    .select({
      id: tomas.id,
      medicamentoId: tomas.medicamentoId,
      horarioId: tomas.horarioId,
      fechaHoraProgramada: tomas.fechaHoraProgramada,
      estado: tomas.estado,
      nombreMedicamento: medicamentos.nombre,
      dosis: medicamentos.dosis,
      momentoComida: medicamentos.momentoComida,
    })
    .from(tomas)
    .innerJoin(medicamentos, eq(medicamentos.id, tomas.medicamentoId))
    .where(
      and(
        eq(medicamentos.activo, true),
        filtroMedicamento,
        gte(tomas.fechaHoraProgramada, new Date(inicioDelDia(desde).getTime() - MS_DIA).toISOString()),
        lte(tomas.fechaHoraProgramada, new Date(hasta.getTime() + MS_DIA).toISOString()),
      ),
    );

  return calcularOcurrencias(horarios, filas, desde, hasta);
}

/**
 * "Eliminar" una toma prevista. Si ya existe la fila, pasa a tumba; si es
 * virtual (una semanal aún no materializada), se crea directamente como
 * tumba, que es lo que impide que la pauta la genere después (ver
 * ESTADO_TOMA en schema.ts).
 */
export async function eliminarOcurrencia(db: Db, ocurrencia: Ocurrencia) {
  if (ocurrencia.tomaId !== null) {
    await db.update(tomas).set({ estado: 'eliminada' }).where(eq(tomas.id, ocurrencia.tomaId));
    return;
  }
  await db
    .insert(tomas)
    .values({
      medicamentoId: ocurrencia.medicamentoId,
      horarioId: ocurrencia.horarioId,
      fechaHoraProgramada: ocurrencia.fechaHoraProgramada,
      estado: 'eliminada',
    })
    .onConflictDoUpdate({
      target: [tomas.horarioId, tomas.fechaHoraProgramada],
      set: { estado: 'eliminada' },
    });
}
