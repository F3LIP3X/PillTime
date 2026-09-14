import type { TipoHorario } from '@/db/schema';
import { claveDia } from '@/features/tomas/ocurrencias';

/**
 * Estado del editor de una pauta (alta y edición comparten este tipo y el
 * componente EditorPauta). Guarda los dos modos a la vez para que cambiar
 * de modo en el alta no borre lo que ya se había escrito en el otro.
 */
export type EstadoPauta = {
  modo: TipoHorario;
  // 'semanal'
  hora: Date;
  dias: number[];
  duracion: 'indefinido' | 'hasta';
  fechaFin: Date;
  // 'intervalo'
  inicio: Date;
  frecuenciaHoras: string;
  duracionDias: string;
};

type HorarioGuardado = {
  tipo: TipoHorario;
  hora: string | null;
  diasSemana: string | null;
  fechaFin: string | null;
  frecuenciaHoras: number | null;
  fechaHoraInicio: string | null;
  duracionDias: number | null;
};

const MS_HORA = 60 * 60 * 1000;

/** "YYYY-MM-DD" local → Date a medianoche local (`new Date(texto)` lo leería como UTC). */
export function fechaDesdeClave(clave: string): Date {
  const [a, m, d] = clave.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function horaTexto(fecha: Date): string {
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
}

/**
 * Hora por defecto: la próxima en punto. Con "ahora mismo" la primera
 * toma caía unos segundos antes de crear la pauta y no se generaba hasta
 * el día siguiente, sin que se entendiera por qué.
 */
function proximaHoraEnPunto() {
  const fecha = new Date();
  fecha.setHours(fecha.getHours() + 1, 0, 0, 0);
  return fecha;
}

export function pautaNueva(): EstadoPauta {
  const dentroDe30Dias = new Date();
  dentroDe30Dias.setDate(dentroDe30Dias.getDate() + 30);
  const inicio = new Date();
  inicio.setSeconds(0, 0);

  return {
    modo: 'semanal',
    hora: proximaHoraEnPunto(),
    dias: [1, 2, 3, 4, 5, 6, 7],
    duracion: 'indefinido',
    fechaFin: dentroDe30Dias,
    inicio,
    frecuenciaHoras: '8',
    duracionDias: '7',
  };
}

export function pautaDesdeHorario(horario: HorarioGuardado): EstadoPauta {
  const base = pautaNueva();
  if (horario.tipo === 'semanal') {
    const [h, m] = (horario.hora ?? '09:00').split(':').map(Number);
    const hora = new Date();
    hora.setHours(h, m, 0, 0);
    return {
      ...base,
      modo: 'semanal',
      hora,
      dias: (horario.diasSemana ?? '').split(',').filter(Boolean).map(Number),
      duracion: horario.fechaFin ? 'hasta' : 'indefinido',
      fechaFin: horario.fechaFin ? fechaDesdeClave(horario.fechaFin) : base.fechaFin,
    };
  }
  return {
    ...base,
    modo: 'intervalo',
    inicio: horario.fechaHoraInicio ? new Date(horario.fechaHoraInicio) : base.inicio,
    frecuenciaHoras: String(horario.frecuenciaHoras ?? 8),
    duracionDias: String(horario.duracionDias ?? 7),
  };
}

/** Instantes ISO de todas las tomas de un tratamiento por intervalo. */
export function fechasTratamiento(inicio: Date, frecuenciaHoras: number, duracionDias: number): string[] {
  if (!(frecuenciaHoras > 0) || !(duracionDias > 0)) return [];
  const total = Math.floor((duracionDias * 24) / frecuenciaHoras);
  return Array.from({ length: total }, (_, i) => new Date(inicio.getTime() + i * frecuenciaHoras * MS_HORA).toISOString());
}

/** Mensaje de error para mostrar, o null si la pauta es válida. */
export function validarPauta(p: EstadoPauta): string | null {
  if (p.modo === 'semanal') {
    if (p.dias.length === 0) return 'Elige al menos un día.';
    if (p.duracion === 'hasta' && claveDia(p.fechaFin) < claveDia(new Date())) {
      return 'El último día no puede ser anterior a hoy.';
    }
    return null;
  }
  const frecuencia = Number(p.frecuenciaHoras);
  const dias = Number(p.duracionDias);
  if (!Number.isInteger(frecuencia) || frecuencia < 1 || frecuencia > 168) return 'La frecuencia debe ser de 1 a 168 horas.';
  if (!Number.isInteger(dias) || dias < 1 || dias > 365) return 'La duración debe ser de 1 a 365 días.';
  if (fechasTratamiento(p.inicio, frecuencia, dias).length === 0) return 'Con esa frecuencia no cabe ninguna toma.';
  return null;
}

/**
 * ¿Ha terminado ya esta pauta? Solo cuando su último día quedó atrás (no
 * en cuanto pasa la última hora): así el último día aún se pueden marcar
 * las tomas antes de que el medicamento pase a "Terminados".
 */
export function pautaTerminada(horario: HorarioGuardado, ahora = new Date()): boolean {
  const hoy = claveDia(ahora);
  if (horario.tipo === 'semanal') {
    return horario.fechaFin !== null && horario.fechaFin < hoy;
  }
  if (!horario.fechaHoraInicio || !horario.frecuenciaHoras || !horario.duracionDias) return false;
  const fechas = fechasTratamiento(new Date(horario.fechaHoraInicio), horario.frecuenciaHoras, horario.duracionDias);
  const ultima = fechas[fechas.length - 1];
  return ultima !== undefined && claveDia(new Date(ultima)) < hoy;
}
