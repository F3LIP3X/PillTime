import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { BriefcaseBusiness, CalendarClock, Check, Code, ExternalLink, Info, Moon, Palette, UserRound } from 'lucide-react-native';

import { Card } from '@/components/Card';
import { IconoCircular } from '@/components/IconoCircular';
import { ListRow } from '@/components/ListRow';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useTheme } from '@/theme/useTheme';
import { usePreferenciasStore, type Sexo } from '@/stores/preferenciasStore';
import { useDb } from '@/db/client';
import { sincronizarNotificaciones } from '@/features/notificaciones/scheduler';
import { COLORES_BASE, paletaDe, type ColorBase } from '@/theme/paletas';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

/** Perfiles del desarrollador, en "Sobre PillTime" → About developer. */
const ENLACES_DESARROLLADOR = {
  linkedin: 'https://www.linkedin.com/in/felipe-toledano-escudero/',
  github: 'https://github.com/F3LIP3X',
};

/**
 * Abre la URL fuera de la app: con la app de LinkedIn/GitHub si está
 * instalada (el sistema resuelve el enlace https) o en el navegador.
 */
async function abrirEnlace(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('No se pudo abrir el enlace', url);
  }
}

export default function Ajustes() {
  const { colors, esOscuro } = useTheme();
  const router = useRouter();
  const tema = usePreferenciasStore((s) => s.tema);
  const setTema = usePreferenciasStore((s) => s.setTema);
  const colorBase = usePreferenciasStore((s) => s.colorBase);
  const setColorBase = usePreferenciasStore((s) => s.setColorBase);
  const sexo = usePreferenciasStore((s) => s.sexo);
  const setSexo = usePreferenciasStore((s) => s.setSexo);
  const db = useDb();

  const cambiarSexo = (valor: Sexo) => {
    setSexo(valor);
    // El recordatorio del ciclo solo se programa con 'mujer'.
    void sincronizarNotificaciones(db);
  };

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
        <Text style={[typography.overline, styles.tituloGrupo, { color: colors.textTertiary }]}>Perfil</Text>
        <Card>
          <View style={styles.filaTema}>
            <IconoCircular tamano={38}>
              <UserRound color={colors.primary} size={18} />
            </IconoCircular>
            <View style={styles.etiquetaTema}>
              <Text style={[typography.body, { color: colors.text }]}>Sexo</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Decide si se muestra la pestaña del ciclo menstrual.
              </Text>
            </View>
          </View>
          <SegmentedControl
            opciones={[
              { valor: 'mujer', etiqueta: 'Mujer' },
              { valor: 'hombre', etiqueta: 'Hombre' },
            ]}
            valor={sexo ?? 'mujer'}
            onChange={cambiarSexo}
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

        <Text style={[typography.overline, styles.tituloGrupo, styles.subgrupo, { color: colors.textTertiary }]}>
          About developer
        </Text>
        <Card sinPadding>
          <ListRow
            titulo="LinkedIn"
            subtitulo="Felipe Toledano Escudero"
            izquierda={
              <IconoCircular>
                <BriefcaseBusiness color={colors.primary} size={20} />
              </IconoCircular>
            }
            derecha={<ExternalLink color={colors.textTertiary} size={16} />}
            onPress={() => abrirEnlace(ENLACES_DESARROLLADOR.linkedin)}
            sinChevron
          />
          <ListRow
            titulo="GitHub"
            subtitulo="@F3LIP3X"
            izquierda={
              <IconoCircular>
                <Code color={colors.primary} size={20} />
              </IconoCircular>
            }
            derecha={<ExternalLink color={colors.textTertiary} size={16} />}
            onPress={() => abrirEnlace(ENLACES_DESARROLLADOR.github)}
            sinChevron
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
  subgrupo: { marginTop: spacing.sm },
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
