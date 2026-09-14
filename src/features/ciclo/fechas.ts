/**
 * Aritmética de días sobre claves "YYYY-MM-DD". Se opera en UTC sobre
 * año/mes/día para que la diferencia entre dos días sea siempre un entero
 * exacto: con fechas locales, un cambio de hora mete días de 23 o 25 h.
 */
const MS_DIA = 86_400_000;

function aUtc(clave: string) {
  const [a, m, d] = clave.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
}

function desdeUtc(ms: number) {
  const f = new Date(ms);
  return `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, '0')}-${String(f.getUTCDate()).padStart(2, '0')}`;
}

export function sumarDias(clave: string, dias: number): string {
  return desdeUtc(aUtc(clave) + dias * MS_DIA);
}

/** b − a en días. */
export function diasEntre(a: string, b: string): number {
  return Math.round((aUtc(b) - aUtc(a)) / MS_DIA);
}

/** Día de la semana ISO (1 = lunes … 7 = domingo) de una clave. */
export function diaSemanaIso(clave: string): number {
  const d = new Date(aUtc(clave)).getUTCDay();
  return d === 0 ? 7 : d;
}

export function fechaLegible(clave: string, opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  const [a, m, d] = clave.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-ES', opciones);
}
