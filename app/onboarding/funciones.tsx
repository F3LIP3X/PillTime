import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Activity, BellRing, Sparkles, Toothbrush } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconoCircular } from '@/components/IconoCircular';
import { PasoOnboarding } from '@/features/onboarding/PasoOnboarding';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function Funciones() {
  const { colors } = useTheme();
  const router = useRouter();

  const funciones = [
    { icono: <BellRing color={colors.primary} size={20} />, titulo: 'Medicación', texto: 'Avisos a la hora de cada toma, stock y caducidad.' },
    { icono: <Activity color={colors.primary} size={20} />, titulo: 'Medidas', texto: 'Tensión, glucosa, peso, saturación y síntomas, con gráficas.' },
    { icono: <Toothbrush color={colors.primary} size={20} />, titulo: 'Salud dental', texto: 'Temporizador de 2 minutos y tu racha de cepillado.' },
  ];

  return (
    <PasoOnboarding
      paso={2}
      icono={<Sparkles color={colors.primary} size={40} />}
      titulo="Qué puedes hacer"
      texto="Empieza por lo que necesites; lo demás estará ahí cuando lo quieras."
      pie={<Button label="Continuar" onPress={() => router.push('/onboarding/perfil')} />}
    >
      <Card sinPadding>
        {funciones.map((f, i) => (
          <View
            key={f.titulo}
            style={[styles.fila, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator }]}
          >
            <IconoCircular tamano={40}>{f.icono}</IconoCircular>
            <View style={styles.textos}>
              <Text style={[typography.bodyStrong, { color: colors.text }]}>{f.titulo}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{f.texto}</Text>
            </View>
          </View>
        ))}
      </Card>
    </PasoOnboarding>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  textos: { flex: 1, gap: 2 },
});
