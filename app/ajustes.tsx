import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarClock, Check, Info, Moon, Palette } from 'lucide-react-native';

import { Card } from '@/components/Card';
import { IconoCircular } from '@/components/IconoCircular';
import { ListRow } from '@/components/ListRow';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useTheme } from '@/theme/useTheme';
import { usePreferenciasStore } from '@/stores/preferenciasStore';
import { COLORES_BASE, paletaDe, type ColorBase } from '@/theme/paletas';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function Ajustes() {
  const { colors, esOscuro } = useTheme();
  const router = useRouter();
  const tema = usePreferenciasStore((s) => s.tema);
  const setTema = usePreferenciasStore((s) => s.setTema);
  const colorBase = usePreferenciasStore((s) => s.colorBase);
  const setColorBase = usePreferenciasStore((s) => s.setColorBase);

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
            valor={tema}
            onChange={setTema}
          />
        </Card>

        <Card>
          <View style={styles.filaTema}>
            <IconoCircular tamano={38}>
              <Palette color={colors.primary} size={18} />
            </IconoCircular>
            <View style={styles.etiquetaTema}>
              <Text style={[typography.body, { color: colors.text }]}>Color de la app</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Cada color ajusta sus tonos para que todo se lea bien.
              </Text>
            </View>
          </View>
          <View style={styles.muestras}>
            {(Object.keys(COLORES_BASE) as ColorBase[]).map((clave) => {
              const muestra = paletaDe(clave, esOscuro);
              const elegido = clave === colorBase;
              return (
                <Pressable
                  key={clave}
                  onPress={() => setColorBase(clave)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: elegido }}
                  accessibilityLabel={`Color ${COLORES_BASE[clave].nombre}`}
                  style={styles.muestra}
                >
                  <View
                    style={[
                      styles.circuloMuestra,
                      { backgroundColor: muestra.primary, borderColor: elegido ? colors.text : 'transparent' },
                    ]}
                  >
                    {elegido && <Check color={muestra.onPrimary} size={20} strokeWidth={3} />}
                  </View>
                  <Text
                    style={[
                      typography.caption,
                      { color: elegido ? colors.text : colors.textSecondary, fontWeight: elegido ? '600' : '400' },
                    ]}
                  >
                    {COLORES_BASE[clave].nombre}
                  </Text>
                </Pressable>
              );
            })}
          </View>
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
  muestras: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  muestra: { width: '30%', alignItems: 'center', gap: spacing.xs },
  circuloMuestra: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
