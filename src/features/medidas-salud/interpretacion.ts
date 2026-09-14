import type { TipoMedidaSalud } from '@/db/schema';
import { formatearNumero, type Medida } from './tipos';

/**
 * Lectura orientativa de las medidas de un periodo para la vista global
 * de Gráficas. Umbrales:
 * - Tensión: clasificación de la Sociedad Europea de Hipertensión (ESH),
 *   la que se usa en España: normal < 130/85, normal-alta hasta 139/89,
 *   alta desde 140/90. Por debajo de 90/60 se señala como baja.
 * - Saturación (SpO₂): ≥ 95 % normal, 91-94 % a vigilar, ≤ 90 % baja.
 * - Pulso en reposo: 50-100 lpm habitual.
 * - Glucosa: sin clasificar salvo extremos (< 70 o ≥ 200 mg/dl), porque
 *   el rango depende de si se midió en ayunas y la app no lo pregunta.
 * Tensión y pulso usan la media de las 3 últimas mediciones: una lectura
 * suelta varía mucho y alarmaría sin motivo.
 *
 * NO es un diagnóstico, y la pantalla lo dice. No añadas consejos
 * médicos ni cambies umbrales sin una fuente clínica.
 */

export type Nivel = 'bien' | 'vigilar' | 'alerta' | 'info';

/** Una fila de la vista global: puede ser un tipo de medida o una parte (el pulso sale de la tensión). */
export type IdSerie = TipoMedidaSalud | 'pulso';

export type Interpretacion = {
  id: IdSerie;
  etiqueta: string;
  ultimoValor: string;
  unidad: string;
  fechaUltimo: string;
  nivel: Nivel;
  estado: string;
  tendencia: string | null;
  /** Valores en orden cronológico para la minigráfica (vacío en síntomas). */
  serie: number[];
  registros: number;
};

type Punto = { t: number; v: number };

const UMBRAL_ESTABLE: Record<Exclude<IdSerie, 'sintoma'>, number> = {
  peso: 0.5,
  tension: 5,
  glucosa: 10,
  saturacion: 1,
  pulso: 5,
  animo: 1,
};

function media(valores: number[]) {
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

/** Media del primer tercio frente a la del último, para no depender de dos lecturas sueltas. */
export function tendencia(puntos: Punto[], umbral: number, unidad: string, decimales = 0): string | null {
  if (puntos.length < 2) return null;
  const tercio = Math.max(1, Math.floor(puntos.length / 3));
  const inicio = media(puntos.slice(0, tercio).map((p) => p.v));
  const fin = media(puntos.slice(-tercio).map((p) => p.v));
  const delta = fin - inicio;
  if (Math.abs(delta) < umbral) return 'Estable';
  const cifra = `${formatearNumero(Math.abs(delta), decimales)}${unidad === '%' ? ' %' : unidad ? ` ${unidad}` : ''}`;
  return delta > 0 ? `Sube ${cifra}` : `Baja ${cifra}`;
}

function ultimos(puntos: Punto[], n: number) {
  return media(puntos.slice(-n).map((p) => p.v));
}

export function interpretar(medidas: Medida[]): Interpretacion[] {
  const ordenadas = [...medidas].sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
  const porTipo = (tipo: TipoMedidaSalud) => ordenadas.filter((m) => m.tipo === tipo);
  const resultado: Interpretacion[] = [];

  const simple = (tipo: 'peso' | 'glucosa' | 'saturacion' | 'animo', etiqueta: string, unidad: string, decimales: number) => {
    const filas = porTipo(tipo).filter((m) => m.valor1 !== null);
    if (filas.length === 0) return null;
    const puntos = filas.map((m) => ({ t: Date.parse(m.fechaHora), v: m.valor1! }));
    const ultimo = filas[filas.length - 1];
    return {
      base: {
        id: tipo,
        etiqueta,
        ultimoValor: formatearNumero(ultimo.valor1!, decimales),
        unidad,
        fechaUltimo: ultimo.fechaHora,
        tendencia: tendencia(puntos, UMBRAL_ESTABLE[tipo], unidad, decimales),
        serie: puntos.map((p) => p.v),
        registros: filas.length,
      },
      puntos,
      ultimo: ultimo.valor1!,
    };
  };

  const tension = porTipo('tension').filter((m) => m.valor1 !== null && m.valor2 !== null);
  if (tension.length > 0) {
    const sist = tension.map((m) => ({ t: Date.parse(m.fechaHora), v: m.valor1! }));
    const diast = tension.map((m) => ({ t: Date.parse(m.fechaHora), v: m.valor2! }));
    const s = ultimos(sist, 3);
    const d = ultimos(diast, 3);
    let nivel: Nivel = 'bien';
    let estado = 'Normal';
    if (s >= 140 || d >= 90) [nivel, estado] = ['alerta', 'Alta'];
    else if (s >= 130 || d >= 85) [nivel, estado] = ['vigilar', 'Normal-alta'];
    else if (s < 90 || d < 60) [nivel, estado] = ['vigilar', 'Baja'];
    const ultimo = tension[tension.length - 1];
    resultado.push({
      id: 'tension',
      etiqueta: 'Tensión',
      ultimoValor: `${formatearNumero(ultimo.valor1!)}/${formatearNumero(ultimo.valor2!)}`,
      unidad: 'mmHg',
      fechaUltimo: ultimo.fechaHora,
      nivel,
      estado: tension.length >= 3 ? `${estado} (media de las 3 últimas)` : estado,
      tendencia: tendencia(sist, UMBRAL_ESTABLE.tension, 'mmHg de sistólica'),
      serie: sist.map((p) => p.v),
      registros: tension.length,
    });

    const conPulso = tension.filter((m) => m.valor3 !== null);
    if (conPulso.length > 0) {
      const pulso = conPulso.map((m) => ({ t: Date.parse(m.fechaHora), v: m.valor3! }));
      const p = ultimos(pulso, 3);
      const [nivelPulso, estadoPulso]: [Nivel, string] =
        p >= 50 && p <= 100 ? ['bien', 'Habitual'] : p >= 40 && p <= 120 ? ['vigilar', p < 50 ? 'Algo bajo' : 'Algo alto'] : ['alerta', p < 40 ? 'Bajo' : 'Alto'];
      const ultimoPulso = conPulso[conPulso.length - 1];
      resultado.push({
        id: 'pulso',
        etiqueta: 'Pulso',
        ultimoValor: formatearNumero(ultimoPulso.valor3!),
        unidad: 'lpm',
        fechaUltimo: ultimoPulso.fechaHora,
        nivel: nivelPulso,
        estado: estadoPulso,
        tendencia: tendencia(pulso, UMBRAL_ESTABLE.pulso, 'lpm'),
        serie: pulso.map((x) => x.v),
        registros: conPulso.length,
      });
    }
  }

  const saturacion = simple('saturacion', 'Saturación', '%', 0);
  if (saturacion) {
    const v = saturacion.ultimo;
    const [nivel, estado]: [Nivel, string] = v >= 95 ? ['bien', 'Normal'] : v > 90 ? ['vigilar', 'Algo baja'] : ['alerta', 'Baja'];
    resultado.push({ ...saturacion.base, nivel, estado });
  }

  const glucosa = simple('glucosa', 'Glucosa', 'mg/dl', 0);
  if (glucosa) {
    const v = glucosa.ultimo;
    const [nivel, estado]: [Nivel, string] =
      v < 70 ? ['alerta', 'Baja'] : v >= 200 ? ['alerta', 'Muy alta'] : ['info', 'Depende de si estabas en ayunas'];
    resultado.push({ ...glucosa.base, nivel, estado });
  }

  const peso = simple('peso', 'Peso', 'kg', 1);
  if (peso) resultado.push({ ...peso.base, nivel: 'info', estado: `${peso.base.registros} ${peso.base.registros === 1 ? 'registro' : 'registros'}` });

  const animo = simple('animo', 'Ánimo', '/10', 0);
  if (animo) {
    resultado.push({ ...animo.base, nivel: 'info', estado: `Media ${formatearNumero(media(animo.puntos.map((p) => p.v)), 1)}/10` });
  }

  const sintomas = porTipo('sintoma');
  if (sintomas.length > 0) {
    const ultimo = sintomas[sintomas.length - 1];
    resultado.push({
      id: 'sintoma',
      etiqueta: 'Síntomas',
      ultimoValor: String(sintomas.length),
      unidad: sintomas.length === 1 ? 'registro' : 'registros',
      fechaUltimo: ultimo.fechaHora,
      nivel: 'info',
      estado: ultimo.notas ? `Último: «${ultimo.notas.slice(0, 60)}${ultimo.notas.length > 60 ? '…' : ''}»` : 'Último sin descripción',
      tendencia: null,
      serie: [],
      registros: sintomas.length,
    });
  }

  return resultado;
}

/** Frase de cabecera de la vista global. */
export function resumenGlobal(interpretaciones: Interpretacion[]): string {
  if (interpretaciones.length === 0) return 'Sin registros en este periodo.';
  const alerta = interpretaciones.filter((i) => i.nivel === 'alerta').length;
  const vigilar = interpretaciones.filter((i) => i.nivel === 'vigilar').length;
  const bien = interpretaciones.filter((i) => i.nivel === 'bien').length;
  const partes: string[] = [];
  if (bien) partes.push(`${bien} en rango`);
  if (vigilar) partes.push(`${vigilar} a vigilar`);
  if (alerta) partes.push(`${alerta} fuera de rango`);
  if (partes.length === 0) return `${interpretaciones.length} ${interpretaciones.length === 1 ? 'medida registrada' : 'medidas registradas'}, sin rangos de referencia.`;
  return partes.join(' · ');
}
