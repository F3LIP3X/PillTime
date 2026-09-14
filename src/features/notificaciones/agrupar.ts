import type { MomentoComida } from '@/db/schema';
import type { Ocurrencia } from '@/features/tomas/ocurrencias';

export type GrupoAviso = {
  /** Instante del aviso, redondeado al minuto. */
  fecha: Date;
  medicamentos: { nombre: string; dosis: string; momentoComida: MomentoComida | null }[];
};

/**
 * Una notificación por minuto con TODOS los medicamentos pendientes de ese
 * minuto, vengan de la pauta que vengan (semanal o intervalo). Evita la
 * fatiga de notificaciones (idea tomada de MyTherapy, ver
 * docs/analisis-competencia.md) y, sobre todo, que un aviso tape a otro:
 * el bug que reportaron fue "con varios a la misma hora solo sale el último".
 */
export function agruparPorMinuto(ocurrencias: Ocurrencia[]): GrupoAviso[] {
  const grupos = new Map<number, GrupoAviso & { ids: Set<number> }>();

  for (const o of ocurrencias) {
    const fecha = new Date(o.fechaHoraProgramada);
    fecha.setSeconds(0, 0);
    const clave = fecha.getTime();

    let grupo = grupos.get(clave);
    if (!grupo) {
      grupo = { fecha, medicamentos: [], ids: new Set() };
      grupos.set(clave, grupo);
    }
    // Dos pautas del mismo medicamento a la misma hora: se nombra una vez.
    if (grupo.ids.has(o.medicamentoId)) continue;
    grupo.ids.add(o.medicamentoId);
    grupo.medicamentos.push({ nombre: o.nombreMedicamento, dosis: o.dosis, momentoComida: o.momentoComida });
  }

  return Array.from(grupos.values())
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
    .map(({ fecha, medicamentos }) => ({ fecha, medicamentos }));
}

function textoMomentoComida(m: MomentoComida | null): string {
  if (m === 'antes') return ' (antes de comer)';
  if (m === 'despues') return ' (después de comer)';
  return '';
}

export function contenidoDeAviso(grupo: GrupoAviso) {
  const lineas = grupo.medicamentos.map((m) => `${m.nombre} ${m.dosis}`.trim() + textoMomentoComida(m.momentoComida));
  const n = grupo.medicamentos.length;
  return {
    title: n === 1 ? 'Es hora de tu medicamento' : `Es hora de tus ${n} medicamentos`,
    // Una línea por medicamento: con la notificación expandida se leen
    // todos; plegada, el título ya dice cuántos son.
    body: lineas.join('\n'),
  };
}
