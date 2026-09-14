import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Droplet, HeartPulse, NotebookPen, Scale, Smile, Wind } from 'lucide-react-native';

import type { TipoMedidaSalud } from '@/db/schema';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';

type Icono = typeof HeartPulse;

/** Orden de uso más habitual, no el del enum del esquema. */
const TIPOS: { tipo: TipoMedidaSalud; etiqueta: string; Icono: Icono }[] = [
  { tipo: 'tension', etiqueta: 'Tensión', Icono: HeartPulse },
  { tipo: 'saturacion', etiqueta: 'Saturación', Icono: Wind },
  { tipo: 'glucosa', etiqueta: 'Glucosa', Icono: Droplet },
  { tipo: 'peso', etiqueta: 'Peso', Icono: Scale },
  { tipo: 'animo', etiqueta: 'Ánimo', Icono: Smile },
  { tipo: 'sintoma', etiqueta: 'Síntomas', Icono: NotebookPen },
];

type Props = { valor: TipoMedidaSalud; onChange: (tipo: TipoMedidaSalud) => void };

/**
 * Tipo de medida como cuadrícula de fichas con icono: los seis a la vista
 * y a un toque. Sustituye a un desplegable (que escondía las opciones tras
 * un menú y no encajaba con la interfaz) y antes a un control segmentado
 * con scroll horizontal (que escondía las de la derecha). Tres columnas
 * para que ninguna etiqueta se corte en móviles estrechos.
 */
export function SelectorTipoMedida({ valor, onChange }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.rejilla} accessibilityRole="radiogroup" accessibilityLabel="Tipo de medida">
      {TIPOS.map(({ tipo, etiqueta, Icono }) => {
        const activo = tipo === valor;
        const color = activo ? colors.onPrimary : colors.primary;
        return (
          <Pressable
            key={tipo}
            onPress={() => onChange(tipo)}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={etiqueta}
            style={({ pressed }) => [
              styles.ficha,
              {
                backgroundColor: activo ? colors.primary : colors.surface,
                borderColor: activo ? colors.primary : colors.separator,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Icono color={color} size={22} />
            <Text
              style={[typography.caption, { color: activo ? colors.onPrimary : colors.text, fontWeight: activo ? '700' : '500' }]}
              numberOfLines={1}
            >
              {etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  ficha: {
    // Tres por fila descontando los dos huecos entre fichas.
    flexBasis: '31%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 68,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
  },
});
