import { useCallback } from 'react';
import { and, eq } from 'drizzle-orm';

import { useDb } from '@/db/client';
import { horariosMedicamento, medicamentos, tomas } from '@/db/schema';

function fechaDeHoyA(hora: string): Date {
  const [h, m] = hora.split(':').map(Number);
  const fecha = new Date();
  fecha.setHours(h, m, 0, 0);
  return fecha;
}

function diaIsoDeHoy(): number {
  const dia = new Date().getDay(); // 0=domingo…6=sábado
  return dia === 0 ? 7 : dia;
}

/**
 * Genera (si no existen ya) las tomas 'pendiente' del día para cada horario
 * 'semanal' activo cuyo día de la semana coincida con hoy. Idempotente: se
 * puede llamar en cada apertura de la pantalla de Inicio sin duplicar
 * filas, porque comprueba antes si ya existe una toma para ese horario en
 * la fecha/hora exacta de hoy.
 *
 * Solo procesa horarios tipo='semanal' — los de tipo='intervalo' (un
 * tratamiento con duración fija, ej. "cada 8 horas durante 7 días") ya
 * tienen TODAS sus tomas generadas de una vez al crearse
 * (useCrearTratamientoIntervalo), no día a día.
 *
 * No hay un job en segundo plano que precree tomas futuras de los
 * horarios 'semanal': se materializan perezosamente al abrir la app. Si
 * la app no se abre un día, ese día no queda registrado como "omitido"
 * automáticamente.
 */
export function useAsegurarTomasDeHoy() {
  const db = useDb();

  return useCallback(async () => {
    const diaIso = diaIsoDeHoy();

    const horarios = await db
      .select({
        id: horariosMedicamento.id,
        medicamentoId: horariosMedicamento.medicamentoId,
        hora: horariosMedicamento.hora,
        diasSemana: horariosMedicamento.diasSemana,
      })
      .from(horariosMedicamento)
      .innerJoin(medicamentos, eq(medicamentos.id, horariosMedicamento.medicamentoId))
      .where(
        and(
          eq(horariosMedicamento.activo, true),
          eq(horariosMedicamento.tipo, 'semanal'),
          eq(medicamentos.activo, true),
        ),
      );

    for (const horario of horarios) {
      // tipo='semanal' garantiza hora/diasSemana no nulos a nivel de
      // aplicación (ver comentario en schema.ts), aunque la columna sea
      // nullable — de ahí los `!`.
      const dias = horario.diasSemana!.split(',').map(Number);
      if (!dias.includes(diaIso)) continue;

      const fechaHoraProgramada = fechaDeHoyA(horario.hora!).toISOString();

      const [existente] = await db
        .select({ id: tomas.id })
        .from(tomas)
        .where(
          and(
            eq(tomas.horarioId, horario.id),
            eq(tomas.fechaHoraProgramada, fechaHoraProgramada),
          ),
        )
        .limit(1);

      if (!existente) {
        await db.insert(tomas).values({
          medicamentoId: horario.medicamentoId,
          horarioId: horario.id,
          fechaHoraProgramada,
          estado: 'pendiente',
        });
      }
    }
  }, [db]);
}
