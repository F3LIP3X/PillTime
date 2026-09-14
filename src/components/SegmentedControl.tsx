import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';

type Opcion<T extends string> = { valor: T; etiqueta: string };

type Props<T extends string> = {
  opciones: Opcion<T>[];
  valor: T;
  onChange: (valor: T) => void;
  /** Con muchas opciones, permite desplazamiento horizontal en vez de apretarlas. */
  desplazable?: boolean;
};

/**
 * Control segmentado: una sola pieza con la selección resaltada dentro,
 * en lugar de N botones sueltos flotando. Comunica mejor que las opciones
 * son excluyentes entre sí y ocupa menos peso visual.
 */
export function SegmentedControl<T extends string>({
  opciones,
  valor,
  onChange,
  desplazable = false,
}: Props<T>) {
  const { colors, esOscuro } = useTheme();

  const contenido = (
    <View style={[styles.pista, { backgroundColor: colors.fill }]}>
      {opciones.map((opcion) => {
        const activa = opcion.valor === valor;
        return (
          <Pressable
            key={opcion.valor}
            onPress={() => onChange(opcion.valor)}
            accessibilityRole="radio"
            accessibilityState={{ selected: activa }}
            accessibilityLabel={opcion.etiqueta}
            style={[
              styles.segmento,
              desplazable ? null : styles.segmentoFlexible,
              activa && {
                backgroundColor: esOscuro ? colors.primary : colors.surface,
                // La pastilla seleccionada se despega del carril con una
                // sombra mínima; en oscuro basta con el color primario.
                ...(esOscuro
                  ? {}
                  : {
                      shadowColor: '#0B1F22',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.12,
                      shadowRadius: 3,
                      elevation: 2,
                    }),
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                typography.bodySmall,
                {
                  fontWeight: activa ? '600' : '400',
                  color: activa ? (esOscuro ? colors.onPrimary : colors.primary) : colors.textSecondary,
                },
              ]}
            >
              {opcion.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (!desplazable) return contenido;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {contenido}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pista: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radii.sm,
    gap: 3,
  },
  segmento: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm - 3,
  },
  segmentoFlexible: { flex: 1 },
});
