import type { TipoMedidaSalud } from '@/db/schema';
import type { DatosMedida } from '../hooks/useMedidasSalud';
import { INFO_MEDIDA, numeroDesdeTexto } from '../tipos';
import type { ValoresFormularioMedida } from './CamposMedida';

/** Formulario → columnas. Los campos que el tipo no usa se guardan a null. */
export function aDatosMedida(tipo: TipoMedidaSalud, valores: ValoresFormularioMedida, fecha: Date): DatosMedida {
  const campos = INFO_MEDIDA[tipo].campos;
  const numero = (i: number) => (i < campos.length ? numeroDesdeTexto(valores.textos[i] ?? '') : null);
  return {
    valor1: numero(0),
    valor2: numero(1),
    valor3: numero(2),
    notas: campos.length === 0 ? valores.notas.trim() : null,
    fechaHora: fecha.toISOString(),
  };
}
