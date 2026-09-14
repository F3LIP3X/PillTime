import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Check, Flame, Play, Toothbrush, X } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { AnilloProgreso } from '@/features/dental/components/AnilloProgreso';
import { useCepillados } from '@/features/dental/hooks/useCepillados';
import {
  CEPILLADOS_RECOMENDADOS_DIA,
  conteoPorDia,
  formatoTemporizador,
  racha,
  semanasCalendario,
  ZONAS_BOCA,
} from '@/features/dental/resumen';
import { claveDia } from '@/features/tomas/ocurrencias';
import { DURACION_CEPILLADO_S, useCepilladoStore } from '@/stores/cepilladoStore';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';

const ETIQUETA_KEEP_AWAKE = 'cepillado';
const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function SaludDental() {
  const { colors } = useTheme();
  const { registros, registrar, eliminar, recargar } = useCepillados();
  const inicio = useCepilladoStore((s) => s.inicio);
  const empezar = useCepilladoStore((s) => s.empezar);
  const cancelar = useCepilladoStore((s) => s.cancelar);
  const terminar = useCepilladoStore((s) => s.terminar);
  const [ahora, setAhora] = useState(Date.now());
  const [recienTerminado, setRecienTerminado] = useState(false);

  useFocusEffect(
    useCallback(() => {
      recargar();
    }, [recargar]),
  );

  const enCurso = inicio !== null;
  const transcurrido = enCurso ? (ahora - inicio) / 1000 : 0;
  const restante = DURACION_CEPILLADO_S - transcurrido;

  // Tic cada 250 ms mientras dura: suficiente para un contador de segundos
  // y para que el anillo avance suave sin gastar batería de más.
  useEffect(() => {
    if (!enCurso) return;
    setAhora(Date.now());
    const id = setInterval(() => setAhora(Date.now()), 250);
    // Que la pantalla no se apague a mitad del cepillado.
    activateKeepAwakeAsync(ETIQUETA_KEEP_AWAKE).catch(() => {});
    return () => {
      clearInterval(id);
      deactivateKeepAwake(ETIQUETA_KEEP_AWAKE).catch(() => {});
    };
  }, [enCurso]);

  // Al llegar a cero se guarda solo, con la hora real de fin (inicio + 2 min),
  // aunque la app haya estado en segundo plano y se detecte al volver.
  useEffect(() => {
    if (!enCurso || restante > 0) return;
    const inicioTerminado = terminar();
    if (inicioTerminado === null) return;
    registrar(new Date(inicioTerminado + DURACION_CEPILLADO_S * 1000), DURACION_CEPILLADO_S);
    setRecienTerminado(true);
  }, [enCurso, restante, terminar, registrar]);

  const conteo = useMemo(() => conteoPorDia(registros.map((r) => r.fechaHora)), [registros]);
  const semanas = useMemo(() => semanasCalendario(conteo, 5), [conteo]);
  const hoy = conteo.get(claveDia(new Date())) ?? 0;
  const diasSeguidos = racha(conteo);

  const zona = Math.min(ZONAS_BOCA.length - 1, Math.floor(transcurrido / (DURACION_CEPILLADO_S / ZONAS_BOCA.length)));

  const handleEmpezar = () => {
    setRecienTerminado(false);
    empezar();
  };

  const handleEliminar = (id: number, fecha: string) => {
    const texto = new Date(fecha).toLocaleString('es-ES', { weekday: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    Alert.alert('Eliminar cepillado', `¿Eliminar el cepillado del ${texto}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminar(id) },
    ]);
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
      <Card elevacion="raised">
        <View style={styles.temporizador}>
          <View style={styles.anillo}>
            <AnilloProgreso
              progreso={enCurso ? transcurrido / DURACION_CEPILLADO_S : recienTerminado ? 1 : 0}
              tamano={220}
              color={recienTerminado ? colors.success : colors.primary}
            />
            <View style={styles.anilloCentro} accessible accessibilityLiveRegion="polite">
              {recienTerminado && !enCurso ? (
                <>
                  <Check color={colors.success} size={40} strokeWidth={2.5} />
                  <Text style={[typography.subtitle, { color: colors.text }]}>¡Hecho!</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.cifra, { color: colors.text }]}>
                    {formatoTemporizador(enCurso ? restante : DURACION_CEPILLADO_S)}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {enCurso ? ZONAS_BOCA[zona] : '2 minutos'}
                  </Text>
                </>
              )}
            </View>
          </View>

          {enCurso && (
            <View style={styles.zonas} accessibilityLabel={`Zona ${zona + 1} de 4`}>
              {ZONAS_BOCA.map((z, i) => (
                <View
                  key={z}
                  style={[styles.zona, { backgroundColor: i < zona ? colors.primary : i === zona ? colors.primarySoft : colors.fill }]}
                />
              ))}
            </View>
          )}

          <Text style={[typography.bodySmall, styles.consejo, { color: colors.textSecondary }]}>
            {enCurso
              ? 'Unos 30 segundos por zona. Se guardará solo al terminar.'
              : recienTerminado
                ? 'Cepillado guardado.'
                : 'La OMS recomienda cepillarse 2 minutos, dos veces al día.'}
          </Text>

          {enCurso ? (
            <Button label="Cancelar" variant="secondary" icono={<X color={colors.primary} size={18} />} onPress={cancelar} />
          ) : (
            <Button
              label={recienTerminado ? 'Empezar otro' : 'Empezar cepillado'}
              icono={<Play color="#FFFFFF" size={18} />}
              onPress={handleEmpezar}
            />
          )}
        </View>
      </Card>

      <View style={styles.cifras}>
        <Card style={styles.cifraTarjeta}>
          <View style={styles.cifraCabecera}>
            <Toothbrush color={colors.textTertiary} size={16} />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Hoy</Text>
          </View>
          <Text style={[typography.numeroGrande, { color: colors.text }]}>
            {hoy}
            <Text style={[typography.subtitle, { color: colors.textTertiary }]}> / {CEPILLADOS_RECOMENDADOS_DIA}</Text>
          </Text>
        </Card>
        <Card style={styles.cifraTarjeta}>
          <View style={styles.cifraCabecera}>
            <Flame color={colors.textTertiary} size={16} />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Racha</Text>
          </View>
          <Text style={[typography.numeroGrande, { color: colors.text }]}>
            {diasSeguidos}
            <Text style={[typography.subtitle, { color: colors.textTertiary }]}> {diasSeguidos === 1 ? 'día' : 'días'}</Text>
          </Text>
        </Card>
      </View>

      <View style={styles.grupo}>
        <Text style={[typography.overline, styles.tituloGrupo, { color: colors.textTertiary }]}>Últimas 5 semanas</Text>
        <Card>
          <View style={styles.calendario}>
            <View style={styles.semana}>
              {DIAS_SEMANA.map((d) => (
                <Text key={d} style={[typography.caption, styles.celdaCabecera, { color: colors.textTertiary }]}>
                  {d}
                </Text>
              ))}
            </View>
            {semanas.map((semana) => (
              <View key={semana[0].clave} style={styles.semana}>
                {semana.map((celda) => {
                  const completo = celda.cepillados >= CEPILLADOS_RECOMENDADOS_DIA;
                  return (
                    <View
                      key={celda.clave}
                      accessible
                      accessibilityLabel={`Día ${celda.dia}: ${celda.futuro ? 'aún no ha llegado' : `${celda.cepillados} ${celda.cepillados === 1 ? 'cepillado' : 'cepillados'}`}`}
                      style={[
                        styles.celda,
                        {
                          backgroundColor: celda.futuro ? 'transparent' : completo ? colors.primary : celda.cepillados > 0 ? colors.primarySoft : colors.fill,
                          borderColor: celda.esHoy ? colors.text : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.caption,
                          { color: celda.futuro ? colors.textTertiary : completo ? '#FFFFFF' : colors.text, fontWeight: celda.esHoy ? '700' : '400' },
                        ]}
                      >
                        {celda.dia}
                      </Text>
                      {/* Puntos además del color: el estado nunca solo por color. */}
                      <View style={styles.puntos}>
                        {Array.from({ length: Math.min(celda.cepillados, 3) }, (_, i) => (
                          <View key={i} style={[styles.punto, { backgroundColor: completo ? '#FFFFFF' : colors.primary }]} />
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </Card>
      </View>

      {registros.length > 0 && (
        <View style={styles.grupo}>
          <Text style={[typography.overline, styles.tituloGrupo, { color: colors.textTertiary }]}>Registros recientes</Text>
          <Card sinPadding>
            {registros.slice(0, 10).map((r, i) => (
              <Pressable
                key={r.id}
                onLongPress={() => handleEliminar(r.id, r.fechaHora)}
                accessibilityHint="Mantén pulsado para eliminar"
                style={[styles.filaRegistro, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator }]}
              >
                <Toothbrush color={colors.primary} size={18} />
                <Text style={[typography.body, styles.filaTexto, { color: colors.text }]}>
                  {new Date(r.fechaHora).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                </Text>
                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                  {new Date(r.fechaHora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </Pressable>
            ))}
          </Card>
          <Text style={[typography.caption, styles.tituloGrupo, { color: colors.textTertiary }]}>
            Mantén pulsado un registro para eliminarlo.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
  temporizador: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  anillo: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  anilloCentro: { position: 'absolute', alignItems: 'center', gap: 2 },
  cifra: { fontSize: 56, fontWeight: '700', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  zonas: { flexDirection: 'row', gap: spacing.xs, width: 180 },
  zona: { flex: 1, height: 6, borderRadius: radii.pill },
  consejo: { textAlign: 'center', paddingHorizontal: spacing.md },
  cifras: { flexDirection: 'row', gap: spacing.md },
  cifraTarjeta: { flex: 1 },
  cifraCabecera: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  grupo: { gap: spacing.sm },
  tituloGrupo: { marginLeft: spacing.xs },
  calendario: { gap: spacing.xs },
  semana: { flexDirection: 'row', gap: spacing.xs },
  celdaCabecera: { flex: 1, textAlign: 'center' },
  celda: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puntos: { flexDirection: 'row', gap: 2, height: 4, marginTop: 1 },
  punto: { width: 4, height: 4, borderRadius: 2 },
  filaRegistro: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4 },
  filaTexto: { flex: 1, textTransform: 'capitalize' },
});
