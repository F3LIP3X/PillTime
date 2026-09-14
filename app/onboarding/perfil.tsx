import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CircleCheck, UserRound } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { PasoOnboarding } from '@/features/onboarding/PasoOnboarding';
import { usePreferenciasStore, type Sexo } from '@/stores/preferenciasStore';
import { useTheme } from '@/theme/useTheme';
import { ALTO_CONTROL, spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';

const OPCIONES: { valor: Sexo; etiqueta: string }[] = [
  { valor: 'mujer', etiqueta: 'Mujer' },
  { valor: 'hombre', etiqueta: 'Hombre' },
];

export default function Perfil() {
  const { colors } = useTheme();
  const router = useRouter();
  const sexo = usePreferenciasStore((s) => s.sexo);
  const setSexo = usePreferenciasStore((s) => s.setSexo);

  return (
    <PasoOnboarding
      paso={3}
      icono={<UserRound color={colors.primary} size={40} />}
      titulo="Un dato sobre ti"
      texto="Lo usamos solo para mostrarte o no el control del ciclo menstrual. Se guarda en este móvil y puedes cambiarlo cuando quieras en Ajustes."
      pie={<Button label="Continuar" onPress={() => router.push('/onboarding/listo')} disabled={!sexo} />}
    >
      <View style={styles.opciones} accessibilityRole="radiogroup">
        {OPCIONES.map((opcion) => {
          const elegida = sexo === opcion.valor;
          return (
            <Pressable
              key={opcion.valor}
              onPress={() => setSexo(opcion.valor)}
              accessibilityRole="radio"
              accessibilityState={{ selected: elegida }}
              style={({ pressed }) => [
                styles.opcion,
                {
                  backgroundColor: elegida ? colors.primarySoft : colors.surface,
                  borderColor: elegida ? colors.primary : colors.separator,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[typography.bodyStrong, styles.opcionTexto, { color: elegida ? colors.primary : colors.text }]}>
                {opcion.etiqueta}
              </Text>
              {elegida && <CircleCheck color={colors.primary} size={22} />}
            </Pressable>
          );
        })}
      </View>
    </PasoOnboarding>
  );
}

const styles = StyleSheet.create({
  opciones: { gap: spacing.sm, marginTop: spacing.sm },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ALTO_CONTROL + 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
  },
  opcionTexto: { flex: 1 },
});
