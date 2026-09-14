import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';

export const TOTAL_PASOS = 4;

type Props = {
  paso: number;
  icono: React.ReactNode;
  titulo: string;
  texto: string;
  children?: React.ReactNode;
  /** Botones fijos abajo. */
  pie: React.ReactNode;
};

/**
 * Plantilla común de cada paso: icono en círculo tintado, título grande,
 * texto corto y los botones abajo, al alcance del pulgar. Los puntos de
 * progreso dicen cuánto queda sin tener que numerar nada.
 */
export function PasoOnboarding({ paso, icono, titulo, texto, children, pie }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.pantalla, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={[styles.circulo, { backgroundColor: colors.primarySoft }]}>{icono}</View>
        <Text style={[typography.largeTitle, styles.titulo, { color: colors.text }]} accessibilityRole="header">
          {titulo}
        </Text>
        <Text style={[typography.body, styles.texto, { color: colors.textSecondary }]}>{texto}</Text>
        {children}
      </ScrollView>

      <View style={[styles.pie, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.puntos} accessible accessibilityLabel={`Paso ${paso} de ${TOTAL_PASOS}`}>
          {Array.from({ length: TOTAL_PASOS }, (_, i) => (
            <View
              key={i}
              style={[
                styles.punto,
                { backgroundColor: i + 1 === paso ? colors.primary : colors.separator, width: i + 1 === paso ? 22 : 8 },
              ]}
            />
          ))}
        </View>
        {pie}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  contenido: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  circulo: {
    width: 88,
    height: 88,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  titulo: {},
  texto: {},
  pie: { paddingHorizontal: spacing.lg, gap: spacing.md },
  puntos: { flexDirection: 'row', gap: 6, alignSelf: 'center', marginBottom: spacing.xs },
  punto: { height: 8, borderRadius: radii.pill },
});
