import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Activity, CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react-native';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';
import { claveDia, inicioDelDia } from '@/features/tomas/ocurrencias';
import { useMedidasDesde } from '../hooks/useMedidasSalud';
import { interpretar, resumenGlobal, type IdSerie, type Interpretacion, type Nivel } from '../interpretacion';
import type { Medida } from '../tipos';
import { GraficaBarras } from './GraficaBarras';
import { GraficaLinea, type SerieGrafica } from './GraficaLinea';
import { MiniGrafica } from './MiniGrafica';

const PERIODOS = [
  { valor: '7', etiqueta: '7 días' },
  { valor: '30', etiqueta: '30 días' },
  { valor: '90', etiqueta: '90 días' },
  { valor: '365', etiqueta: '1 año' },
] as const;
type Periodo = (typeof PERIODOS)[number]['valor'];

function hace(dias: number) {
  const fecha = inicioDelDia(new Date());
  fecha.setDate(fecha.getDate() - (dias - 1));
  return fecha;
}

type DefinicionGrafica = {
  id: IdSerie;
  titulo: string;
  unidad: string;
  decimales: number;
  referencia?: { min: number; max: number; etiqueta: string };
  series: (medidas: Medida[], c: { serie1: string; serie2: string }) => SerieGrafica[];
};

const punto = (m: Medida, v: number | null) => (v === null ? null : { t: Date.parse(m.fechaHora), v });
const puntos = (medidas: Medida[], tipo: string, valor: (m: Medida) => number | null) =>
  medidas.filter((m) => m.tipo === tipo).map((m) => punto(m, valor(m))).filter((p): p is { t: number; v: number } => p !== null);

/** Una gráfica por dato, en el mismo orden que la vista global. El pulso va aparte de la tensión: otra unidad, otro eje. */
const GRAFICAS: DefinicionGrafica[] = [
  {
    id: 'tension',
    titulo: 'Tensión',
    unidad: 'mmHg',
    decimales: 0,
    series: (m, c) => [
      { nombre: 'Sistólica', color: c.serie1, puntos: puntos(m, 'tension', (x) => x.valor1) },
      { nombre: 'Diastólica', color: c.serie2, puntos: puntos(m, 'tension', (x) => x.valor2) },
    ],
  },
  {
    id: 'pulso',
    titulo: 'Pulso',
    unidad: 'lpm',
    decimales: 0,
    referencia: { min: 50, max: 100, etiqueta: 'Rango habitual en reposo' },
    series: (m, c) => [{ nombre: 'Pulso', color: c.serie1, puntos: puntos(m, 'tension', (x) => x.valor3) }],
  },
  {
    id: 'saturacion',
    titulo: 'Saturación de oxígeno',
    unidad: '%',
    decimales: 0,
    referencia: { min: 95, max: 100, etiqueta: 'Normal (95-100 %)' },
    series: (m, c) => [{ nombre: 'SpO₂', color: c.serie1, puntos: puntos(m, 'saturacion', (x) => x.valor1) }],
  },
  { id: 'glucosa', titulo: 'Glucosa', unidad: 'mg/dl', decimales: 0, series: (m, c) => [{ nombre: 'Glucosa', color: c.serie1, puntos: puntos(m, 'glucosa', (x) => x.valor1) }] },
  { id: 'peso', titulo: 'Peso', unidad: 'kg', decimales: 1, series: (m, c) => [{ nombre: 'Peso', color: c.serie1, puntos: puntos(m, 'peso', (x) => x.valor1) }] },
  { id: 'animo', titulo: 'Ánimo', unidad: '/10', decimales: 0, series: (m, c) => [{ nombre: 'Ánimo', color: c.serie1, puntos: puntos(m, 'animo', (x) => x.valor1) }] },
];

/** Síntomas por día (periodo de 7 días) o por semana. */
function recuentoSintomas(medidas: Medida[], dias: number) {
  const sintomas = medidas.filter((m) => m.tipo === 'sintoma');
  const porSemana = dias > 7;
  const cubos = porSemana ? Math.ceil(dias / 7) : dias;
  const inicio = hace(dias);
  return Array.from({ length: cubos }, (_, i) => {
    const desde = new Date(inicio);
    desde.setDate(desde.getDate() + i * (porSemana ? 7 : 1));
    const hasta = new Date(desde);
    hasta.setDate(hasta.getDate() + (porSemana ? 7 : 1));
    return {
      etiqueta: porSemana
        ? desde.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
        : desde.toLocaleDateString('es-ES', { weekday: 'narrow' }),
      valor: sintomas.filter((m) => {
        const t = Date.parse(m.fechaHora);
        return t >= desde.getTime() && t < hasta.getTime();
      }).length,
    };
  });
}

/**
 * Sección de Gráficas de Medidas (petición de beta testers): arriba una
 * vista global que interpreta todos los datos del periodo y, al bajar,
 * una gráfica por dato. La vista global no es una gráfica con todas las
 * series juntas: peso, tensión y glucosa no comparten unidad y un doble
 * eje (o normalizarlas) engaña. Es una fila por dato con su último valor,
 * su tendencia, una minigráfica con escala propia y una lectura
 * orientativa (ver interpretacion.ts). Tocar una fila baja a su gráfica.
 */
export function PanelGraficas() {
  const { colors } = useTheme();
  const [periodo, setPeriodo] = useState<Periodo>('30');
  const dias = Number(periodo);
  const desde = useMemo(() => hace(dias), [dias]);
  const { medidas, recargar } = useMedidasDesde(desde);
  const scroll = useRef<ScrollView>(null);
  const posiciones = useRef<Partial<Record<IdSerie, number>>>({});

  useFocusEffect(
    useCallback(() => {
      recargar();
    }, [recargar]),
  );

  // Todo lo derivado se memoiza sobre `medidas`: cambiar la selección de
  // un punto en una gráfica no debe recalcular las demás.
  const interpretaciones = useMemo(() => interpretar(medidas), [medidas]);
  const graficas = useMemo(
    () =>
      GRAFICAS.map((g) => ({ ...g, datos: g.series(medidas, colors) })).filter((g) => g.datos.some((s) => s.puntos.length > 0)),
    [medidas, colors],
  );
  const sintomas = useMemo(() => recuentoSintomas(medidas, dias), [medidas, dias]);
  const haySintomas = sintomas.some((b) => b.valor > 0);

  const ahora = Date.now();
  const aspecto: Record<Nivel, { color: string; fondo: string; icono: React.ReactNode }> = {
    bien: { color: colors.success, fondo: colors.successSoft, icono: <CircleCheck color={colors.success} size={14} /> },
    vigilar: { color: colors.warning, fondo: colors.warningSoft, icono: <TriangleAlert color={colors.warning} size={14} /> },
    alerta: { color: colors.error, fondo: colors.errorSoft, icono: <CircleAlert color={colors.error} size={14} /> },
    info: { color: colors.textSecondary, fondo: colors.fill, icono: <Info color={colors.textSecondary} size={14} /> },
  };

  const irA = (id: IdSerie) => {
    const y = posiciones.current[id];
    if (y !== undefined) scroll.current?.scrollTo({ y: y - spacing.sm, animated: true });
  };

  return (
    <ScrollView ref={scroll} contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
      <SegmentedControl opciones={[...PERIODOS]} valor={periodo} onChange={setPeriodo} />

      {interpretaciones.length === 0 ? (
        <EmptyState
          icono={<Activity color={colors.primary} size={30} />}
          titulo="Sin datos en este periodo"
          descripcion="Registra medidas en la pestaña Registros y aquí verás cómo evolucionan."
        />
      ) : (
        <>
          <Card sinPadding>
            <View style={styles.resumenCabecera}>
              <Text style={[typography.overline, { color: colors.textTertiary }]}>Visión global</Text>
              <Text style={[typography.subtitle, { color: colors.text }]}>{resumenGlobal(interpretaciones)}</Text>
            </View>
            {interpretaciones.map((i) => (
              <FilaResumen
                key={i.id}
                interpretacion={i}
                aspecto={aspecto[i.nivel]}
                colorSerie={colors.serie1}
                onPress={() => irA(i.id)}
              />
            ))}
            <Text style={[typography.caption, styles.aviso, { color: colors.textTertiary }]}>
              Lectura orientativa con rangos de referencia generales. No es un diagnóstico: ante cualquier duda, consulta a tu médico.
            </Text>
          </Card>

          {graficas.map((g) => {
            const registros = Math.max(...g.datos.map((s) => s.puntos.length));
            return (
              <View key={g.id} onLayout={(e) => (posiciones.current[g.id] = e.nativeEvent.layout.y)} style={styles.grupo}>
                <Text style={[typography.overline, styles.tituloGrupo, { color: colors.textTertiary }]}>
                  {g.titulo} · {registros} {registros === 1 ? 'registro' : 'registros'}
                </Text>
                <Card>
                  <GraficaLinea
                    series={g.datos}
                    desde={desde.getTime()}
                    hasta={ahora}
                    unidad={g.unidad}
                    decimales={g.decimales}
                    referencia={g.referencia}
                  />
                </Card>
              </View>
            );
          })}

          {haySintomas && (
            <View onLayout={(e) => (posiciones.current.sintoma = e.nativeEvent.layout.y)} style={styles.grupo}>
              <Text style={[typography.overline, styles.tituloGrupo, { color: colors.textTertiary }]}>
                Síntomas · {dias > 7 ? 'por semana' : 'por día'}
              </Text>
              <Card>
                <GraficaBarras
                  barras={sintomas}
                  color={colors.serie1}
                  descripcion={`Registros de síntomas ${dias > 7 ? 'por semana' : 'por día'} desde el ${claveDia(desde)}.`}
                />
              </Card>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

type PropsFila = {
  interpretacion: Interpretacion;
  aspecto: { color: string; fondo: string; icono: React.ReactNode };
  colorSerie: string;
  onPress: () => void;
};

function FilaResumen({ interpretacion: i, aspecto, colorSerie, onPress }: PropsFila) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${i.etiqueta}: ${i.ultimoValor} ${i.unidad}. ${i.estado}. ${i.tendencia ?? ''}. Ver gráfica`}
      style={({ pressed }) => [styles.fila, { borderTopColor: colors.separator }, pressed && { backgroundColor: colors.fill }]}
    >
      <View style={styles.filaTextos}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{i.etiqueta}</Text>
        <Text style={[typography.title, { color: colors.text }]}>
          {i.ultimoValor}
          <Text style={[typography.caption, { color: colors.textSecondary }]}> {i.unidad}</Text>
        </Text>
        <View style={styles.filaEstado}>
          <View style={[styles.insignia, { backgroundColor: aspecto.fondo }]}>
            {aspecto.icono}
            <Text style={[typography.caption, { color: aspecto.color, fontWeight: '600' }]} numberOfLines={2}>
              {i.estado}
            </Text>
          </View>
        </View>
        {!!i.tendencia && <Text style={[typography.caption, { color: colors.textSecondary }]}>{i.tendencia} en el periodo</Text>}
      </View>
      <MiniGrafica valores={i.serie} color={colorSerie} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenido: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
  resumenCabecera: { padding: spacing.md, gap: spacing.xs },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  filaTextos: { flex: 1, gap: 2 },
  filaEstado: { flexDirection: 'row', marginTop: 2 },
  insignia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    flexShrink: 1,
  },
  aviso: { padding: spacing.md, paddingTop: spacing.sm },
  grupo: { gap: spacing.sm },
  tituloGrupo: { marginLeft: spacing.xs },
});
