import { claveDia } from '@/features/tomas/ocurrencias';
import { fechaDesdeClave } from './pauta';

type Horario = {
  tipo: 'semanal' | 'intervalo';
  hora: string | null;
  diasSemana: string | null;
  fechaFin: string | null;
  frecuenciaHoras: number | null;
  duracionDias: number | null;
  fechaHoraInicio: string | null;
};

const NOMBRE_DIA: Record<number, string> = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 7: 'D' };

function fechaCorta(fecha: Date) {
  return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
}

/** Texto legible de una pauta para listas: "09:00 · Todos los días" / "Hasta el 12 de octubre". */
export function describirPauta(h: Horario): { titulo: string; detalle: string } {
  if (h.tipo === 'semanal') {
    const dias = (h.diasSemana ?? '').split(',').filter(Boolean).map(Number).sort();
    const textoDias =
      dias.length === 7 ? 'Todos los días' : dias.join() === '1,2,3,4,5' ? 'De lunes a viernes' : dias.map((d) => NOMBRE_DIA[d]).join(' ');
    let fin = 'Indefinido';
    if (h.fechaFin) {
      fin = claveDia(new Date()) > h.fechaFin ? `Terminó el ${fechaCorta(fechaDesdeClave(h.fechaFin))}` : `Hasta el ${fechaCorta(fechaDesdeClave(h.fechaFin))}`;
    }
    return { titulo: `${h.hora} · ${textoDias}`, detalle: fin };
  }
  const dias = h.duracionDias ?? 0;
  return {
    titulo: `Cada ${h.frecuenciaHoras} h durante ${dias} ${dias === 1 ? 'día' : 'días'}`,
    detalle: h.fechaHoraInicio
      ? `Desde el ${new Date(h.fechaHoraInicio).toLocaleString('es-ES', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`
      : '',
  };
}
