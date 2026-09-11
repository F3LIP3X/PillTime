import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';

type Props = {
  icono: React.ReactNode;
  titulo: string;
  descripcion?: string;
};

/**
 * Estado vacío con icono en círculo tintado. Una pantalla vacía con solo
 * una frase suelta parece un error; con un icono y una frase amable
 * parece parte del diseño.
 */
export function EmptyState({ icono, titulo, descripcion }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.contenedor}>
      <View style={[styles.circulo, { backgroundColor: colors.primarySoft }]}>{icono}</View>
      <Text style={[typography.subtitle, styles.centrado, { color: colors.text }]}>{titulo}</Text>
      {!!descripcion && (
        <Text style={[typography.bodySmall, styles.centrado, { color: colors.textSecondary }]}>{descripcion}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  circulo: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  centrado: { textAlign: 'center' },
});
