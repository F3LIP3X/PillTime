import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarClock, ChevronRight } from 'lucide-react-native';

import { useTheme } from '@/theme/useTheme';
import { useThemeStore } from '@/stores/themeStore';
import { spacing, MIN_TOUCH_TARGET } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const OPCIONES_TEMA = [
  { valor: 'sistema', etiqueta: 'Sistema' },
  { valor: 'claro', etiqueta: 'Claro' },
  { valor: 'oscuro', etiqueta: 'Oscuro' },
] as const;

export default function Ajustes() {
  const { colors, esOscuro } = useTheme();
  const router = useRouter();
  const preferencia = useThemeStore((s) => s.preferencia);
  const setPreferencia = useThemeStore((s) => s.setPreferencia);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[typography.subtitle, { color: colors.text }]}>Apariencia</Text>
      <View style={styles.opciones}>
        {OPCIONES_TEMA.map((opcion) => (
          <Pressable
            key={opcion.valor}
            onPress={() => setPreferencia(opcion.valor)}
            accessibilityRole="radio"
            accessibilityState={{ checked: preferencia === opcion.valor }}
            accessibilityLabel={`Tema ${opcion.etiqueta}`}
            style={[
              styles.opcion,
              {
                backgroundColor: preferencia === opcion.valor ? colors.primary : esOscuro ? '#1B2626' : '#FFFFFF',
                borderColor: colors.textSecondary + '33',
              },
            ]}
          >
            <Text style={[typography.bodySmall, { color: preferencia === opcion.valor ? '#FFFFFF' : colors.text }]}>
              {opcion.etiqueta}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[typography.subtitle, { color: colors.text, marginTop: spacing.lg }]}>Salud</Text>
      <Pressable
        onPress={() => router.push('/cita')}
        accessibilityRole="button"
        accessibilityLabel="Citas médicas"
        style={[styles.fila, { borderColor: colors.textSecondary + '33' }]}
      >
        <CalendarClock color={colors.primary} size={20} />
        <Text style={[typography.body, { color: colors.text, flex: 1 }]}>Citas médicas</Text>
        <ChevronRight color={colors.textSecondary} size={20} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, gap: spacing.sm },
  opciones: { flexDirection: 'row', gap: spacing.sm },
  opcion: {
    paddingHorizontal: spacing.md,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
