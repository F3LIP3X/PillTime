import { diasEntre, sumarDias } from './fechas';

/**
 * Cálculos del ciclo, todos locales y a partir solo de las reglas
 * registradas (sin servicios externos). Criterios, alineados con lo que
 * hacen apps de referencia como Clue y con la fisiología básica:
 * - Ciclo = de un inicio de regla al siguiente. Solo cuentan para las
 *   medias los de 15 a 60 días: fuera de eso casi siempre es un olvido de
 *   registro, no un ciclo real, y estropearía la predicción.
 * - Se promedian los 6 últimos ciclos válidos: los cambios recientes
 *   pesan más que los de hace años.
 * - Sin datos suficientes se asume el ciclo "tipo" de 28 días y 5 de regla.
 * - Ovulación estimada 14 días antes de la próxima regla (la fase lútea es
 *   la más estable). Ventana fértil: 5 días antes de la ovulación y el
 *   día siguiente (vida de los espermatozoides + del óvulo).
 * - Regularidad por la desviación típica de la duración del ciclo.
 *
 * Son ESTIMACIONES y la pantalla lo dice: no sirven como anticonceptivo.
 */

export type Periodo = { id: number; fechaInicio: string; fechaFin: string | null };

export type Fase = 'menstruacion' | 'menstruacion-prevista' | 'folicular' | 'fertil' | 'ovulacion' | 'lutea';

export type Regularidad = 'sin-datos' | 'muy-regular' | 'regular' | 'algo-irregular' | 'irregular';

export type CicloPasado = { inicio: string; duracionCiclo: number; duracionRegla: number; valido: boolean };

export type Analisis = {
  mediaCiclo: number;
  mediaRegla: number;
  ciclosUsados: number;
  desviacion: number | null;
  regularidad: Regularidad;
  /** Ciclos completos, del más reciente al más antiguo. */
  historial: CicloPasado[];
  actual: { inicio: string; diaDelCiclo: number; enRegla: boolean; diaDeRegla: number | null } | null;
  prediccion: {
    proximaRegla: string;
    /** Negativo = retraso de N días. */
    diasHasta: number;
    ovulacion: string;
    fertilDesde: string;
    fertilHasta: string;
  } | null;
};

export const CICLO_TIPO = 28;
export const REGLA_TIPO = 5;
const CICLO_MIN = 15;
const CICLO_MAX = 60;
const CICLOS_PROMEDIADOS = 6;
const FASE_LUTEA = 14;
/** Una regla "en curso" de más de 10 días casi seguro es que no se marcó el fin. */
const REGLA_MAX_ABIERTA = 10;

const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function ordenar(periodos: Periodo[]) {
  return [...periodos].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
}

/** Último día de una regla: el registrado; si sigue abierta, hoy (o la media si lleva demasiados días). */
export function finDeRegla(p: Periodo, hoy: string, mediaRegla: number): string {
  if (p.fechaFin) return p.fechaFin;
  const dias = diasEntre(p.fechaInicio, hoy) + 1;
  return dias > REGLA_MAX_ABIERTA ? sumarDias(p.fechaInicio, mediaRegla - 1) : hoy;
}

export function analizar(periodos: Periodo[], hoy: string): Analisis {
  const lista = ordenar(periodos).filter((p) => p.fechaInicio <= hoy);

  const duracionesRegla = lista
    .filter((p) => p.fechaFin)
    .slice(-CICLOS_PROMEDIADOS)
    .map((p) => diasEntre(p.fechaInicio, p.fechaFin!) + 1)
    .filter((d) => d >= 1 && d <= REGLA_MAX_ABIERTA + 5);
  const mediaRegla = duracionesRegla.length ? Math.round(media(duracionesRegla)) : REGLA_TIPO;

  const historial: CicloPasado[] = [];
  for (let i = 0; i < lista.length - 1; i++) {
    const duracionCiclo = diasEntre(lista[i].fechaInicio, lista[i + 1].fechaInicio);
    historial.push({
      inicio: lista[i].fechaInicio,
      duracionCiclo,
      duracionRegla: diasEntre(lista[i].fechaInicio, finDeRegla(lista[i], hoy, mediaRegla)) + 1,
      valido: duracionCiclo >= CICLO_MIN && duracionCiclo <= CICLO_MAX,
    });
  }
  historial.reverse();

  const validos = historial.filter((c) => c.valido).slice(0, CICLOS_PROMEDIADOS).map((c) => c.duracionCiclo);
  const mediaCiclo = validos.length ? Math.round(media(validos)) : CICLO_TIPO;

  let desviacion: number | null = null;
  let regularidad: Regularidad = 'sin-datos';
  if (validos.length >= 3) {
    const m = media(validos);
    desviacion = Math.sqrt(media(validos.map((v) => (v - m) ** 2)));
    regularidad = desviacion <= 2 ? 'muy-regular' : desviacion <= 4 ? 'regular' : desviacion <= 7 ? 'algo-irregular' : 'irregular';
  }

  const ultimo = lista[lista.length - 1];
  if (!ultimo) {
    return { mediaCiclo, mediaRegla, ciclosUsados: 0, desviacion, regularidad, historial, actual: null, prediccion: null };
  }

  const diaDelCiclo = diasEntre(ultimo.fechaInicio, hoy) + 1;
  const finUltima = finDeRegla(ultimo, hoy, mediaRegla);
  const enRegla = hoy <= finUltima;
  const proximaRegla = sumarDias(ultimo.fechaInicio, mediaCiclo);
  const ovulacion = sumarDias(proximaRegla, -FASE_LUTEA);

  return {
    mediaCiclo,
    mediaRegla,
    ciclosUsados: validos.length,
    desviacion,
    regularidad,
    historial,
    actual: { inicio: ultimo.fechaInicio, diaDelCiclo, enRegla, diaDeRegla: enRegla ? diaDelCiclo : null },
    prediccion: {
      proximaRegla,
      diasHasta: diasEntre(hoy, proximaRegla),
      ovulacion,
      fertilDesde: sumarDias(ovulacion, -5),
      fertilHasta: sumarDias(ovulacion, 1),
    },
  };
}

/** Fase de un ciclo que empieza en `inicio`, dura `duracion` días y cuya regla acaba en `finRegla`. */
function faseEnCiclo(dia: string, inicio: string, duracion: number, finRegla: string, prevista: boolean): Fase {
  if (dia <= finRegla) return prevista ? 'menstruacion-prevista' : 'menstruacion';
  const ovulacion = sumarDias(inicio, duracion - FASE_LUTEA);
  if (dia === ovulacion) return 'ovulacion';
  if (dia >= sumarDias(ovulacion, -5) && dia <= sumarDias(ovulacion, 1)) return 'fertil';
  return dia < ovulacion ? 'folicular' : 'lutea';
}

/**
 * Fase (registrada o estimada) de cada día pedido. Días anteriores a la
 * primera regla registrada: sin fase. Ciclos pasados usan su duración real;
 * el actual y los futuros, la media. Si la regla se retrasa, no se pinta
 * una regla "prevista" en días ya pasados: se reprograma a partir de hoy.
 */
export function fasesDeDias(dias: string[], periodos: Periodo[], analisis: Analisis, hoy: string): Map<string, Fase> {
  const lista = ordenar(periodos).filter((p) => p.fechaInicio <= hoy);
  const fases = new Map<string, Fase>();
  if (lista.length === 0) return fases;

  const { mediaCiclo, mediaRegla } = analisis;
  const ultimo = lista[lista.length - 1];
  let proximaPrevista = sumarDias(ultimo.fechaInicio, mediaCiclo);
  if (proximaPrevista <= hoy) proximaPrevista = sumarDias(hoy, 1);

  for (const dia of dias) {
    if (dia < lista[0].fechaInicio) continue;

    // Ciclo registrado que contiene el día (el último inicio <= día).
    let indice = -1;
    for (let i = lista.length - 1; i >= 0; i--) {
      if (lista[i].fechaInicio <= dia) {
        indice = i;
        break;
      }
    }
    const p = lista[indice];
    const siguiente = lista[indice + 1];

    if (siguiente) {
      fases.set(dia, faseEnCiclo(dia, p.fechaInicio, diasEntre(p.fechaInicio, siguiente.fechaInicio), finDeRegla(p, hoy, mediaRegla), false));
      continue;
    }

    if (dia < proximaPrevista) {
      // La ovulación del ciclo actual se estima con la duración media, no con
      // la fecha reprogramada por un retraso: un retraso no mueve hacia
      // atrás una ovulación ya pasada. Los días de retraso quedan como lútea.
      const duracion = mediaCiclo;
      // Días futuros de la regla actual abierta: aún no han pasado, se marcan como previstos.
      const finReal = finDeRegla(p, hoy, mediaRegla);
      const finEstimado = p.fechaFin ?? sumarDias(p.fechaInicio, mediaRegla - 1);
      if (dia > finReal && dia <= finEstimado && dia > hoy) {
        fases.set(dia, 'menstruacion-prevista');
        continue;
      }
      fases.set(dia, faseEnCiclo(dia, p.fechaInicio, duracion, finReal, false));
      continue;
    }

    // Ciclos futuros estimados, uno tras otro con la duración media.
    const n = Math.floor(diasEntre(proximaPrevista, dia) / mediaCiclo);
    const inicio = sumarDias(proximaPrevista, n * mediaCiclo);
    fases.set(dia, faseEnCiclo(dia, inicio, mediaCiclo, sumarDias(inicio, mediaRegla - 1), true));
  }
  return fases;
}

export const ETIQUETA_REGULARIDAD: Record<Regularidad, string> = {
  'sin-datos': 'Faltan datos (3 ciclos como mínimo)',
  'muy-regular': 'Muy regular',
  regular: 'Regular',
  'algo-irregular': 'Algo irregular',
  irregular: 'Irregular',
};

export const ETIQUETA_FASE: Record<Fase, string> = {
  menstruacion: 'Regla',
  'menstruacion-prevista': 'Regla prevista',
  folicular: 'Fase folicular',
  fertil: 'Ventana fértil',
  ovulacion: 'Ovulación estimada',
  lutea: 'Fase lútea',
};
