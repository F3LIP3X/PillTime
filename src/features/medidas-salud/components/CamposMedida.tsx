import { StyleSheet, View } from 'react-native';

import { TextField } from '@/components/TextField';
import type { TipoMedidaSalud } from '@/db/schema';
import { spacing } from '@/theme/spacing';
import { soloDecimal } from '@/features/medicamentos/formulario';
import { INFO_MEDIDA } from '../tipos';

export type ValoresFormularioMedida = { textos: string[]; notas: string };

type Props = {
  tipo: TipoMedidaSalud;
  valor: ValoresFormularioMedida;
  onChange: (valor: ValoresFormularioMedida) => void;
};

/**
 * Campos de una medida según su tipo. Síntomas es texto libre (petición
 * de beta testers: querían describir cómo se encontraban, no poner un
 * número); el resto son numéricos con la unidad dentro del campo.
 */
export function CamposMedida({ tipo, valor, onChange }: Props) {
  const info = INFO_MEDIDA[tipo];

  if (info.campos.length === 0) {
    return (
      <TextField
        label="¿Cómo te encuentras?"
        value={valor.notas}
        onChangeText={(notas) => onChange({ ...valor, notas })}
        multiline
        placeholder="Ej. dolor de cabeza desde media mañana, algo de mareo al levantarme"
        style={styles.textoLibre}
      />
    );
  }

  const cambiarTexto = (i: number, texto: string) => {
    const textos = [...valor.textos];
    textos[i] = info.campos[i].decimales > 0 ? soloDecimal(texto) : texto.replace(/\D/g, '');
    onChange({ ...valor, textos });
  };

  return (
    <View style={styles.fila}>
      {info.campos.map((campo, i) => (
        <View key={campo.etiqueta} style={styles.campo}>
          <TextField
            label={campo.opcional ? `${campo.etiqueta} (opcional)` : campo.etiqueta}
            sufijo={campo.unidad}
            keyboardType={campo.decimales > 0 ? 'decimal-pad' : 'number-pad'}
            value={valor.textos[i] ?? ''}
            onChangeText={(t) => cambiarTexto(i, t)}
            placeholder="0"
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: spacing.sm },
  campo: { flex: 1 },
  textoLibre: { minHeight: 96, textAlignVertical: 'top' },
});
