import type { EstadoToma, MomentoComida, TipoHorario } from '@/db/schema';

/**
 * Cálculo puro (sin base de datos ni React) de las tomas previstas en un
 * rango de fechas. Es la ÚNICA fuente de "qué toca y cuándo": de aquí
 * salen las notificaciones (sincronizarNotificaciones), la generación
 * perezosa de las tomas de hoy (useAsegurarTomasDeHoy) y la lista de
 * próximas tomas del detalle de un medicamento. Antes cada sitio lo
 * calculaba a su manera y por eso una toma omitida seguía avisando: la
 * notificación semanal recurrente no sabía nada del estado de la toma.
 *
 * Una ocurrencia puede ser:
 * - real: ya existe la fila en `tomas` en estado 'pendiente' (tomaId != null).
 * - virtual: una pauta 'semanal' la prevé pero la fila aún no se ha creado
 *   (las semanales se materializan día a día). tomaId = null.
 *
 * Una fila que ya NO está pendiente (tomado, omitido, eliminada…) anula la
 * ocurrencia de su pauta ese día: ni se muestra ni avisa.
 */

export type HorarioParaOcurrencias = {
  id: number;
  medicamentoId: number;
  tipo: TipoHorario;
  hora: string | null;
  diasSemana: string | null;
  fechaHoraInicio: string | null;
  fechaFin: string | null;
  nombreMedicamento: string;
  dosis: string;
  momentoComida: MomentoComida | null;
};

export type TomaParaOcurrencias = {
  id: number;
  medicamentoId: number;
  horarioId: number | null;
  fechaHoraProgramada: string;
  estado: EstadoToma;
  nombreMedicamento: string;
  dosis: string;
  momentoComida: MomentoComida | null;
};

export type Ocurrencia = {
  tomaId: number | null;
  horarioId: number | null;
  medicamentoId: number;
  fechaHoraProgramada: string;
  nombreMedicamento: string;
  dosis: string;
  momentoComida: MomentoComida | null;
};

export const MS_DIA = 24 * 60 * 60 * 1000;

/** Día LOCAL "YYYY-MM-DD" (no `toISOString`, que daría el día en UTC). */
export function claveDia(fecha: Date): string {
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${m}-${d}`;
}

export function inicioDelDia(fecha: Date): Date {
  const copia = new Date(fecha);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

export function finDelDia(fecha: Date): Date {
  const copia = new Date(fecha);
  copia.setHours(23, 59, 59, 999);
  return copia;
}

/** 0=domingo…6=sábado (JS) → ISO 1=lunes…7=domingo, que es lo que guarda `diasSemana`. */
function diaIso(fecha: Date): number {
  const dia = fecha.getDay();
  return dia === 0 ? 7 : dia;
}

/** Instante de la toma de una pauta semanal en un día concreto, o null si ese día no toca. */
export function ocurrenciaSemanalDelDia(horario: HorarioParaOcurrencias, dia: Date): Date | null {
  if (horario.tipo !== 'semanal' || !horario.hora || !horario.diasSemana) return null;

  const dias = horario.diasSemana.split(',').map(Number);
  if (!dias.includes(diaIso(dia))) return null;
  // Comparación de cadenas "YYYY-MM-DD": el orden lexicográfico coincide con el cronológico.
  if (horario.fechaFin && claveDia(dia) > horario.fechaFin) return null;

  const [h, m] = horario.hora.split(':').map(Number);
  const instante = new Date(dia);
  instante.setHours(h, m, 0, 0);

  if (horario.fechaHoraInicio && instante.getTime() < new Date(horario.fechaHoraInicio).getTime()) {
    return null;
  }
  return instante;
}

/**
 * Tomas pendientes (reales + virtuales) con hora dentro de [desde, hasta],
 * ordenadas por hora.
 *
 * `horarios` deben ser solo los activos de medicamentos activos. `tomas`
 * debe cubrir al menos los días completos del rango (desde el inicio del
 * día de `desde`): una fila de una pauta semanal se empareja con su
 * ocurrencia por DÍA, no por instante exacto, para que editar la hora de
 * una toma no haga que la pauta "regenere" otra a la hora original.
 */
export function calcularOcurrencias(
  horarios: HorarioParaOcurrencias[],
  tomas: TomaParaOcurrencias[],
  desde: Date,
  hasta: Date,
): Ocurrencia[] {
  const resultado: Ocurrencia[] = [];
  const diasConFila = new Set<string>();

  for (const toma of tomas) {
    if (toma.horarioId !== null) {
      diasConFila.add(`${toma.horarioId}|${claveDia(new Date(toma.fechaHoraProgramada))}`);
    }
    if (toma.estado !== 'pendiente') continue;

    resultado.push({
      tomaId: toma.id,
      horarioId: toma.horarioId,
      medicamentoId: toma.medicamentoId,
      fechaHoraProgramada: toma.fechaHoraProgramada,
      nombreMedicamento: toma.nombreMedicamento,
      dosis: toma.dosis,
      momentoComida: toma.momentoComida,
    });
  }

  const ultimoDia = inicioDelDia(hasta).getTime();
  for (const horario of horarios) {
    if (horario.tipo !== 'semanal') continue;

    // Se avanza con setDate y no sumando 24 h: en los cambios de hora un
    // día no dura 24 h y la suma acabaría saltándose o repitiendo un día.
    for (let dia = inicioDelDia(desde); dia.getTime() <= ultimoDia; dia.setDate(dia.getDate() + 1)) {
      if (diasConFila.has(`${horario.id}|${claveDia(dia)}`)) continue;

      const instante = ocurrenciaSemanalDelDia(horario, dia);
      if (!instante) continue;

      resultado.push({
        tomaId: null,
        horarioId: horario.id,
        medicamentoId: horario.medicamentoId,
        fechaHoraProgramada: instante.toISOString(),
        nombreMedicamento: horario.nombreMedicamento,
        dosis: horario.dosis,
        momentoComida: horario.momentoComida,
      });
    }
  }

  const tDesde = desde.getTime();
  const tHasta = hasta.getTime();
  return resultado
    .filter((o) => {
      const t = new Date(o.fechaHoraProgramada).getTime();
      return t >= tDesde && t <= tHasta;
    })
    .sort((a, b) => a.fechaHoraProgramada.localeCompare(b.fechaHoraProgramada));
}
