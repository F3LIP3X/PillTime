import { StyleSheet, Text, View } from 'react-native';

import { Pressable3D } from './Pressable3D';
import { useTheme } from '@/theme/useTheme';
import { ALTO_CONTROL, spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';

type Variante = 'primary' | 'secondary' | 'plain' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variante;
  /** Icono opcional a la izquierda del texto (elemento de lucide-react-native). */
  icono?: React.ReactNode;
  disabled?: boolean;
  /** Ocupa todo el ancho disponible (por defecto sí). */
  ancho?: 'completo' | 'ajustado';
  accessibilityLabel?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icono,
  disabled = false,
  ancho = 'completo',
  accessibilityLabel,
}: Props) {
  const { colors, esOscuro } = useTheme();

  const estilos: Record<Variante, { fondo: string; texto: string; borde?: string }> = {
    primary: { fondo: colors.primary, texto: colors.onPrimary },
    // "Tinted": fondo del color de marca muy diluido, texto del color de
    // marca. Pesa mucho menos que un segundo botón sólido al lado.
    secondary: { fondo: colors.primarySoft, texto: colors.primary },
    plain: { fondo: 'transparent', texto: colors.primary },
    danger: { fondo: colors.errorSoft, texto: colors.error },
  };

  const { fondo, texto } = estilos[variant];

  return (
    <Pressable3D
      onPress={disabled ? () => {} : onPress}
      escala={0.96}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.boton,
        {
          backgroundColor: fondo,
          opacity: disabled ? 0.45 : 1,
          alignSelf: ancho === 'completo' ? 'stretch' : 'flex-start',
          paddingHorizontal: ancho === 'completo' ? spacing.lg : spacing.md,
        },
      ]}
    >
      <View style={styles.contenido}>
        {icono}
        <Text style={[typography.bodyStrong, { color: texto }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable3D>
  );
}

const styles = StyleSheet.create({
  boton: {
    minHeight: ALTO_CONTROL,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenido: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
