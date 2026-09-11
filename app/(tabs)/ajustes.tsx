import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarClock, Info, Moon } from 'lucide-react-native';

import { Card } from '@/components/Card';
import { IconoCircular } from '@/components/IconoCircular';
import { ListRow } from '@/components/ListRow';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useTheme } from '@/theme/useTheme';
import { useThemeStore } from '@/stores/themeStore';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function Ajustes() {
  const { colors } = useTheme();
  const router = useRouter();
  const preferencia = useThemeStore((s) => s.preferencia);
  const setPreferencia = useThemeStore((s) => s.setPreferencia);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.contenido}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.grupo}>
        <Text style={[typography.overline, styles.tituloGrupo, { color: colors.textTertiary }]}>Apariencia</Text>
        <Card>
          <View style={styles.filaTema}>
            <IconoCircular tamano={38}>
              <Moon color={colors.primary} size={18} />
            </IconoCircular>
            <Text style={[typography.body, styles.etiquetaTema, { color: colors.text }]}>Tema</Text>
          </View>
          <SegmentedControl
            opciones={[
              { valor: 'sistema', etiqueta: 'Sistema' },
              { valor: 'claro', etiqueta: 'Claro' },
              { valor: 'oscuro', etiqueta: 'Oscuro' },
            ]}
            valor={preferencia}
            onChange={setPreferencia}
          />
        </Card>
      </View>

      <View style={styles.grupo}>
        <Text style={[typography.overline, styles.tituloGrupo, { color: colors.textTertiary }]}>Salud</Text>
        <Card sinPadding>
          <ListRow
            titulo="Citas médicas"
            subtitulo="Recordatorios de consultas"
            izquierda={
              <IconoCircular>
                <CalendarClock color={colors.primary} size={20} />
              </IconoCircular>
            }
            onPress={() => router.push('/cita')}
            conSeparador={false}
          />
        </Card>
      </View>

      <View style={styles.grupo}>
        <Text style={[typography.overline, styles.tituloGrupo, { color: colors.textTertiary }]}>Sobre PillTime</Text>
        <Card sinPadding>
          <ListRow
            titulo="Tus datos no salen del móvil"
            subtitulo="Sin cuenta, sin servidor, sin conexión"
            izquierda={
              <IconoCircular>
                <Info color={colors.primary} size={20} />
              </IconoCircular>
            }
            conSeparador={false}
          />
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  grupo: { gap: spacing.sm },
  tituloGrupo: { marginLeft: spacing.xs },
  filaTema: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  etiquetaTema: { flex: 1 },
});
