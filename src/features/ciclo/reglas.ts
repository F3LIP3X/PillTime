import { diasEntre, fechaLegible, sumarDias } from './fechas';
import { finDeRegla, type Periodo } from './prediccion';

/** Días máximos de una regla "en curso" antes de darla por olvidada (igual que en prediccion.ts). */
const REGLA_MAX_ABIERTA = 10;

export type PlanInicio =
  | { error: string }
  | { insertar: { fechaInicio: string; fechaFin: string | null }; cerrar?: { id: number; fechaFin: string } };

/**
 * Qué hacer al marcar "empezó la regla" un día concreto (hoy o un día
 * pasado). Reglas:
 * - No en el futuro, ni dentro de otra regla ya registrada.
 * - Si hay una regla abierta de hace pocos días, se pide cerrarla antes
 *   (probablemente es la misma regla). Si es de hace más de 10 días, se
 *   cierra sola con la duración media: se olvidó marcar el fin.
 * - Una regla registrada a posteriori (no la última, o de hace días) se
 *   guarda ya cerrada con la duración media, sin pisar la siguiente.
 */
export function planInicio(periodos: Periodo[], fecha: string, hoy: string, mediaRegla: number): PlanInicio {
  if (fecha > hoy) return { error: 'No se puede registrar una regla en el futuro.' };

  const ordenados = [...periodos].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
  const dentro = ordenados.find((p) => fecha >= p.fechaInicio && fecha <= finDeRegla(p, hoy, mediaRegla));
  if (dentro) {
    return { error: `Ese día ya forma parte de la regla que empezó el ${fechaLegible(dentro.fechaInicio, { day: 'numeric', month: 'long' })}.` };
  }

  const abierta = ordenados.find((p) => p.fechaFin === null);
  let cerrar: { id: number; fechaFin: string } | undefined;
  if (abierta && abierta.fechaInicio < fecha) {
    if (diasEntre(abierta.fechaInicio, fecha) <= REGLA_MAX_ABIERTA) {
      return { error: 'Tienes una regla en curso. Márcala como terminada antes de registrar otra.' };
    }
    const fin = sumarDias(abierta.fechaInicio, mediaRegla - 1);
    cerrar = { id: abierta.id, fechaFin: fin < fecha ? fin : sumarDias(fecha, -1) };
  }

  const siguiente = ordenados.find((p) => p.fechaInicio > fecha);
  const esReciente = diasEntre(fecha, hoy) < mediaRegla;
  let fechaFin: string | null = null;
  if (siguiente || !esReciente) {
    const tope = siguiente ? sumarDias(siguiente.fechaInicio, -1) : hoy;
    const estimado = sumarDias(fecha, mediaRegla - 1);
    fechaFin = estimado < tope ? estimado : tope;
  }

  return { insertar: { fechaInicio: fecha, fechaFin }, ...(cerrar ? { cerrar } : {}) };
}

/** Error al marcar el fin de una regla, o null si vale. */
export function validarFin(periodos: Periodo[], periodo: Periodo, fecha: string, hoy: string): string | null {
  if (fecha < periodo.fechaInicio) return 'El fin no puede ser anterior al inicio.';
  if (fecha > hoy) return 'No se puede marcar el fin en el futuro.';
  const siguiente = periodos
    .filter((p) => p.fechaInicio > periodo.fechaInicio)
    .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))[0];
  if (siguiente && fecha >= siguiente.fechaInicio) return 'Ese día ya es de la regla siguiente.';
  if (diasEntre(periodo.fechaInicio, fecha) + 1 > 15) return 'Una regla de más de 15 días no parece correcta; revisa la fecha.';
  return null;
}
