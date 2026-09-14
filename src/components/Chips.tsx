import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';

type Props<T extends string> = {
  opciones: { valor: T; etiqueta: string }[];
  seleccion: T[];
  onChange: (seleccion: T[]) => void;
  /** false = como mucho una; volver a tocar la elegida la desmarca. */
  multiple?: boolean;
  etiquetaAccesible: string;
};

/**
 * Selección rápida con chips que saltan de línea (nunca scroll horizontal,
 * ver Selector). A diferencia de SegmentedControl, permite no elegir nada:
 * en un registro de síntomas "no lo he apuntado" es un valor válido.
 */
export function Chips<T extends string>({ opciones, seleccion, onChange, multiple = false, etiquetaAccesible }: Props<T>) {
  const { colors } = useTheme();

  const alternar = (valor: T) => {
    const marcada = seleccion.includes(valor);
    if (multiple) onChange(marcada ? seleccion.filter((v) => v !== valor) : [...seleccion, valor]);
    else onChange(marcada ? [] : [valor]);
  };

  return (
    <View style={styles.contenedor} accessibilityLabel={etiquetaAccesible}>
      {opciones.map((o) => {
        const marcada = seleccion.includes(o.valor);
        return (
          <Pressable
            key={o.valor}
            onPress={() => alternar(o.valor)}
            accessibilityRole={multiple ? 'checkbox' : 'radio'}
            accessibilityState={multiple ? { checked: marcada } : { selected: marcada }}
            accessibilityLabel={o.etiqueta}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: marcada ? colors.primary : colors.fill, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            {marcada && <Check color={colors.onPrimary} size={14} strokeWidth={3} />}
            <Text style={[typography.bodySmall, { color: marcada ? colors.onPrimary : colors.text, fontWeight: marcada ? '600' : '400' }]}>
              {o.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
});
