import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Redirect, useFocusEffect } from 'expo-router';
import { BellRing, CalendarHeart, Droplet, Info } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconoCircular } from '@/components/IconoCircular';
import { useDb } from '@/db/client';
import { CalendarioCiclo, diasDeCuadricula } from '@/features/ciclo/components/CalendarioCiclo';
import { HojaDiaCiclo } from '@/features/ciclo/components/HojaDiaCiclo';
import { diasEntre, fechaLegible, sumarDias } from '@/features/ciclo/fechas';
import { useCiclo, useRegistrosCiclo } from '@/features/ciclo/hooks/useCiclo';
import { ETIQUETA_FASE, ETIQUETA_REGULARIDAD, fasesDeDias } from '@/features/ciclo/prediccion';
import { sincronizarNotificaciones } from '@/features/notificaciones/scheduler';
import { usePreferenciasStore } from '@/stores/preferenciasStore';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

function primerDiaDelMes(clave: string, desplazamiento = 0) {
  const [a, m] = clave.split('-').map(Number);
  const f = new Date(a, m - 1 + desplazamiento, 1);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function Ciclo() {
  const sexo = usePreferenciasStore((s) => s.sexo);
  // La ruta existe siempre (ver app/(tabs)/_layout.tsx): si no aplica, fuera.
  if (sexo !== 'mujer') return <Redirect href="/" />;
  return <PantallaCiclo />;
}

function PantallaCiclo() {
  const { colors } = useTheme();
  const db = useDb();
  const { periodos, analisis, hoy, recargar, registrarInicio, registrarFin, eliminarPeriodo } = useCiclo();
  const [mes, setMes] = useState(() => primerDiaDelMes(hoy));
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null);
  const recordatorio = usePreferenciasStore((s) => s.recordatorioCiclo);
  const setRecordatorio = usePreferenciasStore((s) => s.setRecordatorioCiclo);
  const sop = usePreferenciasStore((s) => s.sop);
  const setSop = usePreferenciasStore((s) => s.setSop);

  const celdas = useMemo(() => diasDeCuadricula(mes).filter((d): d is string => d !== null), [mes]);
  const { registros, guardar, recargar: recargarRegistros } = useRegistrosCiclo(celdas[0], celdas[celdas.length - 1]);

  useFocusEffect(
    useCallback(() => {
      recargar();
      recargarRegistros();
    }, [recargar, recargarRegistros]),
  );

  const fases = useMemo(() => fasesDeDias(celdas, periodos, analisis, hoy), [celdas, periodos, analisis, hoy]);
  const faseHoy = useMemo(() => fasesDeDias([hoy], periodos, analisis, hoy).get(hoy), [periodos, analisis, hoy]);
  const diasConRegistro = useMemo(() => new Set(registros.keys()), [registros]);

  const { actual, prediccion } = analisis;
  const reglaAbierta = periodos.find((p) => p.fechaFin === null && actual?.enRegla);

  const handleSop = (activo: boolean) => {
    setSop(activo);
    // Cambia la fecha estimada: el aviso previo a la regla se reprograma.
    void sincronizarNotificaciones(db);
  };

  const handleRecordatorio = (activo: boolean) => {
    setRecordatorio(activo);
    void sincronizarNotificaciones(db);
  };

  const handleHoy = async () => {
    const error = reglaAbierta ? await registrarFin(reglaAbierta, hoy) : await registrarInicio(hoy);
    if (error) Alert.alert('No se pudo guardar', error);
  };

  let titular: string;
  let detalle: string;
  if (!actual || !prediccion) {
    titular = 'Registra tu regla';
    detalle = 'Marca el primer día de tu próxima regla (o de la última, en el calendario) y PillTime empezará a estimar tu ciclo.';
  } else if (actual.enRegla) {
    titular = `Día ${actual.diaDeRegla} de la regla`;
    detalle = `Empezó el ${fechaLegible(actual.inicio, { day: 'numeric', month: 'long' })}.`;
  } else if (sop) {
    // Con SOP no se da una cuenta atrás con la misma seguridad que a un
    // ciclo regular: se enseña el día del ciclo y la fecha como orientación.
    titular = `Día ${actual.diaDelCiclo} del ciclo`;
    detalle =
      prediccion.diasHasta >= 0
        ? `Regla orientativa hacia el ${fechaLegible(prediccion.proximaRegla, { day: 'numeric', month: 'long' })}.`
        : `La fecha orientativa (${fechaLegible(prediccion.proximaRegla, { day: 'numeric', month: 'long' })}) ya pasó; con SOP es habitual que el ciclo se alargue.`;
  } else if (prediccion.diasHasta > 0) {
    titular = prediccion.diasHasta === 1 ? 'La regla se estima mañana' : `Regla en ${prediccion.diasHasta} días`;
    detalle = `Hacia el ${fechaLegible(prediccion.proximaRegla, { weekday: 'long', day: 'numeric', month: 'long' })}. Día ${actual.diaDelCiclo} del ciclo.`;
  } else if (prediccion.diasHasta === 0) {
    titular = 'La regla se estima hoy';
    detalle = `Día ${actual.diaDelCiclo} del ciclo.`;
  } else {
    titular = `Retraso de ${-prediccion.diasHasta} ${prediccion.diasHasta === -1 ? 'día' : 'días'}`;
    detalle = `Se esperaba el ${fechaLegible(prediccion.proximaRegla, { day: 'numeric', month: 'long' })}. Los ciclos varían; si te preocupa, consulta a tu médico.`;
  }

  const mostrarFertil = !sop && prediccion && actual && !actual.enRegla && prediccion.fertilHasta >= hoy;

  return (
    <View style={[styles.pantalla, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <Card elevacion="raised">
          <View style={styles.resumen}>
            <View style={styles.resumenFila}>
              <IconoCircular fondo={colors.menstruacionSoft} tamano={48}>
                <Droplet color={colors.menstruacion} size={24} />
              </IconoCircular>
              <View style={styles.textos}>
                <Text style={[typography.title, { color: colors.text }]}>{titular}</Text>
                {!!faseHoy && (
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Hoy: {ETIQUETA_FASE[faseHoy].toLowerCase()}</Text>
                )}
              </View>
            </View>
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>{detalle}</Text>
            {analisis.confianza === 'baja' && prediccion && (
              <View style={[styles.avisoConfianza, { backgroundColor: colors.warningSoft }]}>
                <Info color={colors.warning} size={18} />
                <Text style={[typography.caption, styles.textos, { color: colors.text }]}>
                  {sop
                    ? 'Predicción orientativa y menos precisa: con SOP los ciclos suelen durar de 35 a más de 90 días y puede haber meses sin ovulación. Por eso no se estiman la ovulación ni la ventana fértil.'
                    : 'Tus ciclos son irregulares: toma las fechas como orientativas.'}
                </Text>
              </View>
            )}
            {mostrarFertil && (
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                Ventana fértil estimada: {fechaLegible(prediccion.fertilDesde)} – {fechaLegible(prediccion.fertilHasta)}.
              </Text>
            )}
            <Button
              label={reglaAbierta ? 'Hoy terminó la regla' : 'Hoy me vino la regla'}
              variant={reglaAbierta ? 'secondary' : 'primary'}
              icono={<Droplet color={reglaAbierta ? colors.primary : colors.onPrimary} size={18} />}
              onPress={handleHoy}
            />
          </View>
        </Card>

        <Card>
          <CalendarioCiclo
            mes={mes}
            fases={fases}
            diasConRegistro={diasConRegistro}
            hoy={hoy}
            sinOvulacion={sop}
            onCambiarMes={(delta) => setMes((m) => primerDiaDelMes(m, delta))}
            onDiaPress={setDiaAbierto}
          />
        </Card>
        <Text style={[typography.caption, styles.nota, { color: colors.textTertiary }]}>
          Toca un día para apuntar síntomas o corregir las fechas de una regla.
        </Text>

        <View style={styles.grupo}>
          <Text style={[typography.overline, styles.nota, { color: colors.textTertiary }]}>Tus ciclos</Text>
          <Card sinPadding>
            <View style={styles.cifras}>
              <Cifra etiqueta="Ciclo medio" valor={`${analisis.mediaCiclo} días`} />
              <Cifra etiqueta="Regla media" valor={`${analisis.mediaRegla} días`} />
            </View>
            {/* Etiqueta y valor en líneas separadas: "Faltan datos (3 ciclos como
                mínimo)" no cabía al lado y se salía de la tarjeta. */}
            <View style={[styles.filaRegularidad, { borderTopColor: colors.separator }]}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Regularidad</Text>
              <Text style={[typography.bodyStrong, { color: colors.text }]}>{ETIQUETA_REGULARIDAD[analisis.regularidad]}</Text>
            </View>
            {analisis.ciclosUsados === 0 && (
              <Text style={[typography.caption, styles.aviso, { color: colors.textTertiary }]}>
                Mientras no haya ciclos completos se usa un ciclo tipo de 28 días.
              </Text>
            )}
            {analisis.historial.slice(0, 12).map((c) => (
              <View key={c.inicio} style={[styles.filaCiclo, { borderTopColor: colors.separator }]}>
                <View style={styles.textos}>
                  <Text style={[typography.body, { color: colors.text }]}>
                    {fechaLegible(c.inicio, { day: 'numeric', month: 'short' })} – {fechaLegible(sumarDias(c.inicio, c.duracionCiclo - 1), { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Regla de {c.duracionRegla} {c.duracionRegla === 1 ? 'día' : 'días'}
                    {c.valido ? '' : ` · no cuenta para la media (fuera de ${analisis.rangoValido[0]}-${analisis.rangoValido[1]} días)`}
                  </Text>
                </View>
                <Text style={[typography.bodyStrong, { color: colors.text }]}>{c.duracionCiclo} días</Text>
              </View>
            ))}
          </Card>
        </View>

        <Card>
          <View style={styles.resumenFila}>
            <IconoCircular tamano={38}>
              <CalendarHeart color={colors.primary} size={18} />
            </IconoCircular>
            <View style={styles.textos}>
              <Text style={[typography.body, { color: colors.text }]}>Síndrome de ovario poliquístico (SOP)</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Acepta ciclos de hasta 120 días, no estima la ovulación y añade síntomas habituales del SOP.
              </Text>
            </View>
            <Switch
              value={sop}
              onValueChange={handleSop}
              trackColor={{ true: colors.primary, false: colors.fill }}
              accessibilityLabel="Síndrome de ovario poliquístico (SOP)"
            />
          </View>
          <View style={[styles.separadorAjuste, { backgroundColor: colors.separator }]} />
          <View style={styles.resumenFila}>
            <IconoCircular tamano={38}>
              <BellRing color={colors.primary} size={18} />
            </IconoCircular>
            <View style={styles.textos}>
              <Text style={[typography.body, { color: colors.text }]}>Avisarme antes de la regla</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Una notificación 2 días antes de la fecha estimada.</Text>
            </View>
            <Switch
              value={recordatorio}
              onValueChange={handleRecordatorio}
              trackColor={{ true: colors.primary, false: colors.fill }}
              accessibilityLabel="Avisarme antes de la regla"
            />
          </View>
        </Card>

        <View style={styles.pie}>
          <CalendarHeart color={colors.textTertiary} size={16} />
          <Text style={[typography.caption, styles.textos, { color: colors.textTertiary }]}>
            Las fechas son estimaciones a partir de tus ciclos registrados y se calculan en este móvil. No sirven como método
            anticonceptivo ni para diagnosticar nada.
            {prediccion && prediccion.diasHasta < 0 && diasEntre(prediccion.proximaRegla, hoy) > 60 ? ' Hace mucho que no registras una regla: las estimaciones pueden no ser fiables.' : ''}
          </Text>
        </View>
      </ScrollView>

      <HojaDiaCiclo
        dia={diaAbierto}
        hoy={hoy}
        fase={diaAbierto ? fases.get(diaAbierto) : undefined}
        periodos={periodos}
        mediaRegla={analisis.mediaRegla}
        registro={diaAbierto ? registros.get(diaAbierto) : undefined}
        onClose={() => setDiaAbierto(null)}
        onGuardar={guardar}
        onInicio={registrarInicio}
        onFin={registrarFin}
        onEliminarPeriodo={eliminarPeriodo}
      />
    </View>
  );
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.cifra}>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{etiqueta}</Text>
      <Text style={[typography.title, { color: colors.text }]}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  contenido: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  resumen: { gap: spacing.sm },
  resumenFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  textos: { flex: 1, gap: 2 },
  nota: { marginLeft: spacing.xs },
  grupo: { gap: spacing.sm, marginTop: spacing.sm },
  cifras: { flexDirection: 'row', padding: spacing.md, gap: spacing.md },
  cifra: { flex: 1, gap: 2 },
  avisoConfianza: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm + 2, borderRadius: 10 },
  separadorAjuste: { height: StyleSheet.hairlineWidth, marginVertical: spacing.md },
  filaRegularidad: {
    gap: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  aviso: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  filaCiclo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pie: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xs, marginTop: spacing.sm },
});
