import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';
import { diaSemanaIso, sumarDias } from '../fechas';
import { ETIQUETA_FASE, type Fase } from '../prediccion';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

type Props = {
  /** Primer día del mes mostrado, "YYYY-MM-01". */
  mes: string;
  fases: Map<string, Fase>;
  diasConRegistro: Set<string>;
  hoy: string;
  onCambiarMes: (delta: number) => void;
  onDiaPress: (dia: string) => void;
};

/** Días que pinta la cuadrícula de un mes: de lunes a domingo, con los huecos del mes anterior/siguiente vacíos. */
export function diasDeCuadricula(mes: string): (string | null)[] {
  const [a, m] = mes.split('-').map(Number);
  const diasMes = new Date(a, m, 0).getDate();
  const huecoInicial = diaSemanaIso(mes) - 1;
  const celdas: (string | null)[] = Array(huecoInicial).fill(null);
  for (let i = 0; i < diasMes; i++) celdas.push(sumarDias(mes, i));
  while (celdas.length % 7 !== 0) celdas.push(null);
  return celdas;
}

/**
 * Calendario del ciclo. Cada fase lleva una marca distinta además del
 * color (relleno, borde discontinuo, fondo suave, punto), y la leyenda de
 * debajo las explica: la fase nunca se comunica solo por color.
 */
export function CalendarioCiclo({ mes, fases, diasConRegistro, hoy, onCambiarMes, onDiaPress }: Props) {
  const { colors } = useTheme();
  const [a, m] = mes.split('-').map(Number);
  const titulo = new Date(a, m - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const celdas = diasDeCuadricula(mes);
  const semanas = Array.from({ length: celdas.length / 7 }, (_, i) => celdas.slice(i * 7, i * 7 + 7));

  const estiloCelda = (fase: Fase | undefined) => {
    switch (fase) {
      case 'menstruacion':
        return { fondo: colors.menstruacion, texto: colors.onFase, borde: 'transparent', discontinuo: false };
      case 'menstruacion-prevista':
        return { fondo: 'transparent', texto: colors.text, borde: colors.menstruacion, discontinuo: true };
      case 'ovulacion':
        return { fondo: colors.fertil, texto: colors.onFase, borde: 'transparent', discontinuo: false };
      case 'fertil':
        return { fondo: colors.fertilSoft, texto: colors.text, borde: 'transparent', discontinuo: false };
      default:
        return { fondo: 'transparent', texto: colors.text, borde: 'transparent', discontinuo: false };
    }
  };

  return (
    <View style={styles.contenedor}>
      <View style={styles.cabecera}>
        <Pressable onPress={() => onCambiarMes(-1)} accessibilityRole="button" accessibilityLabel="Mes anterior" hitSlop={10} style={styles.flecha}>
          <ChevronLeft color={colors.primary} size={22} />
        </Pressable>
        <Text style={[typography.bodyStrong, styles.titulo, { color: colors.text }]}>{titulo}</Text>
        <Pressable onPress={() => onCambiarMes(1)} accessibilityRole="button" accessibilityLabel="Mes siguiente" hitSlop={10} style={styles.flecha}>
          <ChevronRight color={colors.primary} size={22} />
        </Pressable>
      </View>

      <View style={styles.semana}>
        {DIAS.map((d) => (
          <Text key={d} style={[typography.caption, styles.celdaCabecera, { color: colors.textTertiary }]}>
            {d}
          </Text>
        ))}
      </View>

      {semanas.map((semana, i) => (
        <View key={i} style={styles.semana}>
          {semana.map((dia, j) => {
            if (!dia) return <View key={j} style={styles.celda} />;
            const fase = fases.get(dia);
            const estilo = estiloCelda(fase);
            const esHoy = dia === hoy;
            const numero = Number(dia.slice(8));
            return (
              <Pressable
                key={dia}
                onPress={() => onDiaPress(dia)}
                accessibilityRole="button"
                accessibilityLabel={`${numero}${esHoy ? ', hoy' : ''}${fase ? `, ${ETIQUETA_FASE[fase]}` : ''}${diasConRegistro.has(dia) ? ', con síntomas apuntados' : ''}`}
                style={styles.celda}
              >
                <View
                  style={[
                    styles.circulo,
                    {
                      backgroundColor: estilo.fondo,
                      borderColor: estilo.borde,
                      borderStyle: estilo.discontinuo ? 'dashed' : 'solid',
                    },
                  ]}
                >
                  <Text style={[typography.bodySmall, { color: estilo.texto, fontWeight: esHoy ? '800' : '400' }]}>{numero}</Text>
                </View>
                <View style={styles.marcas}>
                  {esHoy && <View style={[styles.barraHoy, { backgroundColor: colors.text }]} />}
                  {!esHoy && diasConRegistro.has(dia) && <View style={[styles.punto, { backgroundColor: colors.textSecondary }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      <View style={styles.leyenda}>
        <ElementoLeyenda etiqueta="Regla">
          <View style={[styles.muestra, { backgroundColor: colors.menstruacion }]} />
        </ElementoLeyenda>
        <ElementoLeyenda etiqueta="Regla prevista">
          <View style={[styles.muestra, { borderColor: colors.menstruacion, borderWidth: 1.5, borderStyle: 'dashed' }]} />
        </ElementoLeyenda>
        <ElementoLeyenda etiqueta="Ventana fértil">
          <View style={[styles.muestra, { backgroundColor: colors.fertilSoft }]} />
        </ElementoLeyenda>
        <ElementoLeyenda etiqueta="Ovulación">
          <View style={[styles.muestra, { backgroundColor: colors.fertil }]} />
        </ElementoLeyenda>
        <ElementoLeyenda etiqueta="Síntomas">
          <View style={[styles.punto, { backgroundColor: colors.textSecondary }]} />
        </ElementoLeyenda>
      </View>
    </View>
  );
}

function ElementoLeyenda({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.elementoLeyenda}>
      {children}
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: spacing.xs },
  cabecera: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  titulo: { flex: 1, textAlign: 'center', textTransform: 'capitalize' },
  flecha: { padding: spacing.xs },
  semana: { flexDirection: 'row' },
  celdaCabecera: { flex: 1, textAlign: 'center' },
  celda: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  circulo: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcas: { height: 6, justifyContent: 'center', alignItems: 'center' },
  barraHoy: { width: 14, height: 2.5, borderRadius: 2 },
  punto: { width: 5, height: 5, borderRadius: 3 },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  elementoLeyenda: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  muestra: { width: 14, height: 14, borderRadius: 7 },
});
