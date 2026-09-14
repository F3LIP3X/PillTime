import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';
import { escalaLineal, ticksLimpios } from '../escalas';
import { formatearNumero } from '../tipos';

export type SerieGrafica = {
  nombre: string;
  color: string;
  /** Ordenados por t (ms). */
  puntos: { t: number; v: number }[];
};

type Props = {
  series: SerieGrafica[];
  desde: number;
  hasta: number;
  unidad: string;
  decimales?: number;
  /** Banda de referencia sombreada (p. ej. SpO₂ ≥ 95 %). */
  referencia?: { min: number; max: number; etiqueta: string };
  alto?: number;
};

const MARGEN = { arriba: 12, derecha: 12, abajo: 24, izquierda: 40 };

function fechaCorta(t: number) {
  return new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

/**
 * Gráfica de líneas en SVG, sin librería de gráficas (react-native-svg ya
 * estaba en el proyecto). Un solo eje Y: dos medidas de distinta unidad van
 * en gráficas separadas, nunca con doble eje.
 *
 * Especificación visual: líneas de 2 px, puntos de 8 px con anillo del
 * color de superficie, rejilla fina y recesiva, etiquetas en tinta de
 * texto (nunca del color de la serie). Tocar o arrastrar selecciona el
 * registro más cercano y muestra sus valores: es la versión táctil del
 * tooltip.
 */
export function GraficaLinea({ series, desde, hasta, unidad, decimales = 0, referencia, alto = 180 }: Props) {
  const { colors } = useTheme();
  const [ancho, setAncho] = useState(0);
  const [seleccion, setSeleccion] = useState<number | null>(null);

  const geometria = useMemo(() => {
    if (ancho === 0) return null;
    const valores = series.flatMap((s) => s.puntos.map((p) => p.v));
    if (valores.length === 0) return null;
    let min = Math.min(...valores);
    let max = Math.max(...valores);
    if (referencia) {
      min = Math.min(min, referencia.min);
      max = Math.max(max, referencia.max);
    }
    const ticks = ticksLimpios(min, max);
    const x = escalaLineal([desde, hasta], [MARGEN.izquierda, ancho - MARGEN.derecha]);
    const y = escalaLineal([ticks[0], ticks[ticks.length - 1]], [alto - MARGEN.abajo, MARGEN.arriba]);
    const trazos = series.map((s) =>
      s.puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' '),
    );
    // Instantes únicos de todas las series, para seleccionar por cercanía.
    const instantes = Array.from(new Set(series.flatMap((s) => s.puntos.map((p) => p.t)))).sort((a, b) => a - b);
    return { ticks, x, y, trazos, instantes };
  }, [ancho, alto, series, desde, hasta, referencia]);

  const alMedir = (e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width);

  const seleccionarEn = (px: number) => {
    if (!geometria || geometria.instantes.length === 0) return;
    let mejor = geometria.instantes[0];
    for (const t of geometria.instantes) {
      if (Math.abs(geometria.x(t) - px) < Math.abs(geometria.x(mejor) - px)) mejor = t;
    }
    setSeleccion(mejor);
  };

  const ejeX = [desde, desde + (hasta - desde) / 2, hasta];
  const valoresSeleccion =
    seleccion !== null
      ? series
          .map((s) => ({ serie: s, punto: s.puntos.find((p) => p.t === seleccion) }))
          .filter((x): x is { serie: SerieGrafica; punto: { t: number; v: number } } => !!x.punto)
      : [];

  const ultimo = series.map((s) => s.puntos[s.puntos.length - 1]).filter(Boolean);
  const descripcion = `Gráfica de ${series.map((s) => s.nombre).join(' y ')} del ${fechaCorta(desde)} al ${fechaCorta(hasta)}. ${
    ultimo.length ? `Último valor: ${ultimo.map((p) => formatearNumero(p.v, decimales)).join(' / ')} ${unidad}.` : ''
  }`;

  return (
    <View style={styles.container}>
      <View style={[styles.lectura, { backgroundColor: colors.fill, opacity: seleccion !== null ? 1 : 0 }]}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {seleccion !== null
            ? new Date(seleccion).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            : ' '}
        </Text>
        <View style={styles.lecturaValores}>
          {valoresSeleccion.map(({ serie, punto }) => (
            <View key={serie.nombre} style={styles.lecturaValor}>
              {series.length > 1 && <View style={[styles.clave, { backgroundColor: serie.color }]} />}
              <Text style={[typography.bodyStrong, { color: colors.text }]}>
                {formatearNumero(punto.v, decimales)}
                <Text style={[typography.caption, { color: colors.textSecondary }]}> {unidad}</Text>
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View
        onLayout={alMedir}
        style={{ height: alto }}
        accessible
        accessibilityLabel={descripcion}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        // Dentro de un ScrollView vertical: se cede el gesto si el usuario
        // realmente quiere desplazar la pantalla.
        onResponderTerminationRequest={() => true}
        onResponderGrant={(e) => seleccionarEn(e.nativeEvent.locationX)}
        onResponderMove={(e) => seleccionarEn(e.nativeEvent.locationX)}
      >
        {geometria && (
          <Svg width={ancho} height={alto}>
            {referencia && (
              <Rect
                x={MARGEN.izquierda}
                width={ancho - MARGEN.izquierda - MARGEN.derecha}
                y={geometria.y(referencia.max)}
                height={Math.max(0, geometria.y(referencia.min) - geometria.y(referencia.max))}
                fill={colors.success}
                opacity={0.08}
              />
            )}
            {geometria.ticks.map((tick, i) => (
              <G key={tick}>
                <Line
                  x1={MARGEN.izquierda}
                  x2={ancho - MARGEN.derecha}
                  y1={geometria.y(tick)}
                  y2={geometria.y(tick)}
                  stroke={i === 0 ? colors.eje : colors.rejilla}
                  strokeWidth={1}
                />
                <SvgText
                  x={MARGEN.izquierda - 6}
                  y={geometria.y(tick) + 4}
                  fontSize={11}
                  fill={colors.textTertiary}
                  textAnchor="end"
                >
                  {formatearNumero(tick, 1)}
                </SvgText>
              </G>
            ))}
            {ejeX.map((t, i) => (
              <SvgText
                key={t}
                x={geometria.x(t)}
                y={alto - 6}
                fontSize={11}
                fill={colors.textTertiary}
                textAnchor={i === 0 ? 'start' : i === ejeX.length - 1 ? 'end' : 'middle'}
              >
                {fechaCorta(t)}
              </SvgText>
            ))}

            {seleccion !== null && (
              <Line
                x1={geometria.x(seleccion)}
                x2={geometria.x(seleccion)}
                y1={MARGEN.arriba}
                y2={alto - MARGEN.abajo}
                stroke={colors.textTertiary}
                strokeWidth={1}
              />
            )}

            {series.map((s, i) => (
              <G key={s.nombre}>
                <Path d={geometria.trazos[i]} stroke={s.color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                {s.puntos.map((p) => {
                  const destacado = p.t === seleccion || (seleccion === null && p === s.puntos[s.puntos.length - 1]);
                  // Con muchos registros solo se pinta el punto final o el seleccionado: puntos en todos ensucian.
                  if (!destacado && s.puntos.length > 20) return null;
                  return (
                    <Circle
                      key={p.t}
                      cx={geometria.x(p.t)}
                      cy={geometria.y(p.v)}
                      r={destacado ? 5 : 4}
                      fill={s.color}
                      stroke={colors.surface}
                      strokeWidth={2}
                    />
                  );
                })}
              </G>
            ))}
          </Svg>
        )}
      </View>

      {(series.length > 1 || referencia) && (
        <View style={styles.leyenda}>
          {series.length > 1 &&
            series.map((s) => (
              <View key={s.nombre} style={styles.leyendaItem}>
                <View style={[styles.claveLinea, { backgroundColor: s.color }]} />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{s.nombre}</Text>
              </View>
            ))}
          {referencia && (
            <View style={styles.leyendaItem}>
              <View style={[styles.claveBanda, { backgroundColor: colors.successSoft }]} />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{referencia.etiqueta}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  lectura: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.sm,
    minHeight: 36,
  },
  lecturaValores: { flexDirection: 'row', gap: spacing.md },
  lecturaValor: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  clave: { width: 8, height: 8, borderRadius: 4 },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  claveLinea: { width: 14, height: 2, borderRadius: 1 },
  claveBanda: { width: 14, height: 10, borderRadius: 2 },
});
