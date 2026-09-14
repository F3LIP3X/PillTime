import type { TipoMedidaSalud } from '@/db/schema';

export type Medida = {
  id: number;
  tipo: TipoMedidaSalud;
  valor1: number | null;
  valor2: number | null;
  valor3: number | null;
  notas: string | null;
  fechaHora: string;
};

type Campo = { etiqueta: string; unidad: string; min: number; max: number; decimales: number; opcional?: boolean };

export type InfoMedida = {
  etiqueta: string;
  /** Unidad del valor principal, para listas y ejes. */
  unidad: string;
  /** Campos numéricos del formulario, en orden (valor1, valor2, valor3). Vacío = texto libre. */
  campos: Campo[];
};

/**
 * Metadatos de cada tipo de medida. Los rangos min/max no son clínicos:
 * solo filtran errores de tecleo (un peso de 7000 kg, una saturación de 140 %).
 */
export const INFO_MEDIDA: Record<TipoMedidaSalud, InfoMedida> = {
  peso: { etiqueta: 'Peso', unidad: 'kg', campos: [{ etiqueta: 'Peso', unidad: 'kg', min: 1, max: 400, decimales: 1 }] },
  tension: {
    etiqueta: 'Tensión',
    unidad: 'mmHg',
    campos: [
      { etiqueta: 'Sistólica', unidad: 'mmHg', min: 50, max: 260, decimales: 0 },
      { etiqueta: 'Diastólica', unidad: 'mmHg', min: 30, max: 160, decimales: 0 },
      { etiqueta: 'Pulso', unidad: 'lpm', min: 25, max: 250, decimales: 0, opcional: true },
    ],
  },
  glucosa: { etiqueta: 'Glucosa', unidad: 'mg/dl', campos: [{ etiqueta: 'Glucosa', unidad: 'mg/dl', min: 10, max: 700, decimales: 0 }] },
  saturacion: {
    etiqueta: 'Saturación de oxígeno',
    unidad: '%',
    campos: [{ etiqueta: 'SpO₂', unidad: '%', min: 50, max: 100, decimales: 0 }],
  },
  sintoma: { etiqueta: 'Síntomas', unidad: '', campos: [] },
  animo: { etiqueta: 'Ánimo', unidad: '/10', campos: [{ etiqueta: 'Ánimo (1 a 10)', unidad: '/10', min: 1, max: 10, decimales: 0 }] },
};

export function numeroDesdeTexto(texto: string): number | null {
  if (!texto.trim()) return null;
  const n = Number(texto.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function formatearNumero(valor: number, decimales = 0): string {
  return valor.toLocaleString('es-ES', { maximumFractionDigits: decimales });
}

/** Valida los textos del formulario. Devuelve el mensaje de error o null. */
export function validarValores(tipo: TipoMedidaSalud, textos: string[], notas: string): string | null {
  const info = INFO_MEDIDA[tipo];
  if (info.campos.length === 0) return notas.trim() ? null : 'Describe cómo te encuentras.';

  for (let i = 0; i < info.campos.length; i++) {
    const campo = info.campos[i];
    const texto = textos[i] ?? '';
    if (!texto.trim()) {
      if (campo.opcional) continue;
      return `Falta ${campo.etiqueta.toLowerCase()}.`;
    }
    const n = numeroDesdeTexto(texto);
    if (n === null || n < campo.min || n > campo.max) {
      return `${campo.etiqueta}: entre ${campo.min} y ${campo.max} ${campo.unidad}.`.replace(' /10', '');
    }
  }
  if (tipo === 'tension') {
    const [s, d] = textos.map(numeroDesdeTexto);
    if (s !== null && d !== null && d >= s) return 'La diastólica tiene que ser menor que la sistólica.';
  }
  return null;
}

/** "120/80 mmHg · 72 lpm", "72,5 kg", o el texto del síntoma. */
export function textoMedida(m: Medida): { valor: string; unidad: string; extra?: string } {
  const info = INFO_MEDIDA[m.tipo];
  if (m.tipo === 'sintoma') {
    // Registros anteriores al texto libre guardaban un número.
    return { valor: m.notas ?? (m.valor1 !== null ? String(m.valor1) : ''), unidad: '' };
  }
  if (m.tipo === 'tension') {
    return {
      valor: `${formatearNumero(m.valor1 ?? 0)}/${formatearNumero(m.valor2 ?? 0)}`,
      unidad: 'mmHg',
      extra: m.valor3 !== null ? `${formatearNumero(m.valor3)} lpm` : undefined,
    };
  }
  return { valor: formatearNumero(m.valor1 ?? 0, info.campos[0]?.decimales ?? 0), unidad: info.unidad };
}
