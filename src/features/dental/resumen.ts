import { claveDia } from '@/features/tomas/ocurrencias';

/** Cepillados recomendados al día (OMS / FDI: dos veces al día). */
export const CEPILLADOS_RECOMENDADOS_DIA = 2;

export const ZONAS_BOCA = ['Arriba a la derecha', 'Arriba a la izquierda', 'Abajo a la izquierda', 'Abajo a la derecha'] as const;

export function conteoPorDia(fechas: string[]): Map<string, number> {
  const conteo = new Map<string, number>();
  for (const f of fechas) {
    const clave = claveDia(new Date(f));
    conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
  }
  return conteo;
}

/**
 * Días seguidos con al menos un cepillado, contando hacia atrás desde hoy.
 * Si hoy aún no hay ninguno, la racha se cuenta desde ayer: a las 8:00 no
 * tiene sentido decirle a alguien que ha perdido su racha.
 */
export function racha(conteo: Map<string, number>, hoy = new Date()): number {
  const dia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (!conteo.has(claveDia(dia))) dia.setDate(dia.getDate() - 1);
  let dias = 0;
  while (conteo.has(claveDia(dia))) {
    dias++;
    dia.setDate(dia.getDate() - 1);
  }
  return dias;
}

export type CeldaCalendario = { clave: string; dia: number; cepillados: number; esHoy: boolean; futuro: boolean };

/** Semanas completas (lunes a domingo) que acaban en la semana actual. */
export function semanasCalendario(conteo: Map<string, number>, semanas: number, hoy = new Date()): CeldaCalendario[][] {
  const lunesActual = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  lunesActual.setDate(lunesActual.getDate() - ((lunesActual.getDay() + 6) % 7));
  const inicio = new Date(lunesActual);
  inicio.setDate(inicio.getDate() - (semanas - 1) * 7);
  const claveHoy = claveDia(hoy);

  return Array.from({ length: semanas }, (_, s) =>
    Array.from({ length: 7 }, (_, d) => {
      const fecha = new Date(inicio);
      fecha.setDate(inicio.getDate() + s * 7 + d);
      const clave = claveDia(fecha);
      return { clave, dia: fecha.getDate(), cepillados: conteo.get(clave) ?? 0, esHoy: clave === claveHoy, futuro: clave > claveHoy };
    }),
  );
}

export function formatoTemporizador(segundos: number): string {
  const s = Math.max(0, Math.ceil(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
