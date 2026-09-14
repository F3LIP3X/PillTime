import { useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Archive, CalendarDays, Clock, FileText, Package, Pencil, Pill, Trash2, Utensils } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconoCircular } from '@/components/IconoCircular';
import { Pressable3D } from '@/components/Pressable3D';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';
import { useMedicamento } from '@/features/medicamentos/hooks/useMedicamento';
import { useMedicamentos } from '@/features/medicamentos/hooks/useMedicamentos';
import { useArchivarMedicamento } from '@/features/medicamentos/hooks/useActualizarMedicamento';
import { useEliminarTomaPrevista, useProximasTomas } from '@/features/tomas/hooks/useProximasTomas';
import { claveDia, type Ocurrencia } from '@/features/tomas/ocurrencias';

const ETIQUETA_MOMENTO: Record<string, string> = {
  antes: 'Antes de comer',
  despues: 'Después de comer',
  ninguno: 'Indiferente con las comidas',
};

const ETIQUETA_DIA: Record<number, string> = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 7: 'D' };

const UMBRAL_STOCK_BAJO = 5;

/** "YYYY-MM-DD" local → "12 de octubre". Se construye en local, no con `new Date(texto)`, que lo leería como UTC. */
function fechaLarga(clave: string) {
  const [a, m, d] = clave.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
}

function etiquetaDiaToma(fechaIso: string) {
  const fecha = new Date(fechaIso);
  const hoy = new Date();
  const manana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
  if (claveDia(fecha) === claveDia(hoy)) return 'Hoy';
  if (claveDia(fecha) === claveDia(manana)) return 'Mañana';
  const texto = fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function DetalleMedicamento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const medicamentoId = Number(id);
  const router = useRouter();
  const { colors } = useTheme();
  const { medicamento, horarios, recargar: recargarMedicamento } = useMedicamento(medicamentoId);
  const { medicamentos: conStock, recargar: recargarStock } = useMedicamentos({ soloActivos: false });
  const archivar = useArchivarMedicamento();
  const { tomasPrevistas, recargar: recargarPrevistas } = useProximasTomas(medicamentoId);
  const eliminarTomaPrevista = useEliminarTomaPrevista();

  const stock = conStock.find((m) => m.id === medicamentoId);

  // Expo Router no desmonta esta pantalla al volver de "Editar" (usa
  // router.back()), así que un fetch de solo-montaje se quedaría con los
  // datos viejos. Se refresca cada vez que la pantalla recupera el foco.
  useFocusEffect(
    useCallback(() => {
      recargarMedicamento();
      recargarStock();
      recargarPrevistas();
    }, [recargarMedicamento, recargarStock, recargarPrevistas]),
  );

  if (!medicamento) return null;

  const unidadesRestantes = stock ? stock.stockRestante : medicamento.stockInicial;
  const stockBajo = unidadesRestantes <= UMBRAL_STOCK_BAJO;

  const handleQuitarToma = (toma: Ocurrencia) => {
    const cuando = `${etiquetaDiaToma(toma.fechaHoraProgramada).toLowerCase()} a las ${new Date(
      toma.fechaHoraProgramada,
    ).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    Alert.alert('Quitar esta toma', `Se quitará solo la toma de ${cuando}. El resto de la pauta no cambia.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          await eliminarTomaPrevista(toma);
          await recargarPrevistas();
        },
      },
    ]);
  };

  const handleArchivar = async () => {
    await archivar(medicamentoId);
    router.back();
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.encabezado}>
        <IconoCircular tamano={56}>
          <Pill color={colors.primary} size={26} />
        </IconoCircular>
        <View style={styles.encabezadoTextos}>
          <Text style={[typography.title, { color: colors.text }]}>{medicamento.nombre}</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>{medicamento.dosis}</Text>
        </View>
      </View>

      <View style={styles.tarjetasCifra}>
        <Card style={styles.tarjetaCifra}>
          <View style={styles.cifraCabecera}>
            <Package color={stockBajo ? colors.error : colors.textTertiary} size={16} />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Quedan</Text>
          </View>
          <Text style={[typography.numeroGrande, { color: stockBajo ? colors.error : colors.text }]}>
            {unidadesRestantes}
          </Text>
          <Text style={[typography.caption, { color: colors.textTertiary }]}>
            de {medicamento.stockInicial} unidades
          </Text>
        </Card>

        <Card style={styles.tarjetaCifra}>
          <View style={styles.cifraCabecera}>
            <Pill color={colors.textTertiary} size={16} />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Por toma</Text>
          </View>
          <Text style={[typography.numeroGrande, { color: colors.text }]}>{medicamento.unidadesPorToma}</Text>
          <Text style={[typography.caption, { color: colors.textTertiary }]}>
            {medicamento.unidadesPorToma === 1 ? 'unidad' : 'unidades'}
          </Text>
        </Card>
      </View>

      <View style={styles.grupo}>
        <Text style={[typography.overline, styles.tituloGrupo, { color: colors.textTertiary }]}>Pauta</Text>
        <Card>
          {horarios.length === 0 && (
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Sin horarios configurados.</Text>
          )}
          {horarios.map((horario) => (
            <View key={horario.id} style={styles.filaHorario}>
              {horario.tipo === 'semanal' ? (
                <>
                  <Clock color={colors.primary} size={18} />
                  <View style={styles.horarioTextos}>
                    <Text style={[typography.bodyStrong, { color: colors.text }]}>{horario.hora}</Text>
                    <View style={styles.diasFila}>
                      {[1, 2, 3, 4, 5, 6, 7].map((dia) => {
                        const activo = horario.diasSemana!.split(',').map(Number).includes(dia);
                        return (
                          <View
                            key={dia}
                            style={[
                              styles.diaPunto,
                              { backgroundColor: activo ? colors.primary : colors.fill },
                            ]}
                          >
                            <Text
                              style={[
                                typography.caption,
                                { color: activo ? '#FFFFFF' : colors.textTertiary, fontWeight: '600' },
                              ]}
                            >
                              {ETIQUETA_DIA[dia]}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {horario.fechaFin
                        ? claveDia(new Date()) > horario.fechaFin
                          ? `Terminó el ${fechaLarga(horario.fechaFin)}`
                          : `Hasta el ${fechaLarga(horario.fechaFin)}, incluido`
                        : 'Indefinido'}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <CalendarDays color={colors.primary} size={18} />
                  <View style={styles.horarioTextos}>
                    <Text style={[typography.bodyStrong, { color: colors.text }]}>
                      Cada {horario.frecuenciaHoras} h durante {horario.duracionDias}{' '}
                      {horario.duracionDias === 1 ? 'día' : 'días'}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      Desde {new Date(horario.fechaHoraInicio!).toLocaleString('es-ES')}
                    </Text>
                  </View>
                </>
              )}
            </View>
          ))}

          <View style={[styles.separador, { backgroundColor: colors.separator }]} />

          <View style={styles.filaHorario}>
            <Utensils color={colors.textTertiary} size={18} />
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
              {ETIQUETA_MOMENTO[medicamento.momentoComida ?? 'ninguno']}
            </Text>
          </View>
        </Card>
      </View>

      {medicamento.activo && (
        <View style={styles.grupo}>
          <Text style={[typography.overline, styles.tituloGrupo, { color: colors.textTertiary }]}>
            Próximas tomas · 7 días
          </Text>
          <Card sinPadding>
            {tomasPrevistas.length === 0 ? (
              <Text style={[typography.bodySmall, styles.sinTomas, { color: colors.textSecondary }]}>
                No hay tomas previstas en los próximos 7 días.
              </Text>
            ) : (
              tomasPrevistas.map((toma, index) => (
                <View
                  key={`${toma.horarioId}-${toma.fechaHoraProgramada}`}
                  style={[
                    styles.filaToma,
                    index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
                  ]}
                >
                  <View style={styles.horarioTextos}>
                    <Text style={[typography.body, { color: colors.text }]}>
                      {new Date(toma.fechaHoraProgramada).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {etiquetaDiaToma(toma.fechaHoraProgramada)}
                    </Text>
                  </View>
                  <Pressable3D
                    onPress={() => handleQuitarToma(toma)}
                    escala={0.9}
                    accessibilityRole="button"
                    accessibilityLabel="Quitar esta toma"
                    style={styles.botonQuitar}
                  >
                    <Trash2 color={colors.error} size={18} />
                  </Pressable3D>
                </View>
              ))
            )}
          </Card>
        </View>
      )}

      {!!medicamento.notas && (
        <View style={styles.grupo}>
          <Text style={[typography.overline, styles.tituloGrupo, { color: colors.textTertiary }]}>Notas</Text>
          <Card>
            <View style={styles.filaHorario}>
              <FileText color={colors.textTertiary} size={18} />
              <Text style={[typography.bodySmall, styles.notas, { color: colors.text }]}>{medicamento.notas}</Text>
            </View>
          </Card>
        </View>
      )}

      <View style={styles.acciones}>
        <Button
          label="Editar medicamento"
          icono={<Pencil color="#FFFFFF" size={18} />}
          onPress={() => router.push(`/medicamento/${medicamentoId}/editar`)}
        />
        {medicamento.activo && (
          <Button
            label="Archivar"
            variant="secondary"
            icono={<Archive color={colors.primary} size={18} />}
            onPress={handleArchivar}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.xs },
  encabezadoTextos: { flex: 1, gap: 2 },
  tarjetasCifra: { flexDirection: 'row', gap: spacing.md },
  tarjetaCifra: { flex: 1 },
  cifraCabecera: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  grupo: { gap: spacing.sm },
  tituloGrupo: { marginLeft: spacing.xs },
  filaHorario: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, paddingVertical: spacing.xs },
  horarioTextos: { flex: 1, gap: spacing.xs },
  diasFila: { flexDirection: 'row', gap: spacing.xs },
  diaPunto: {
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaToma: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  sinTomas: { padding: spacing.md },
  botonQuitar: { padding: spacing.sm },
  separador: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  notas: { flex: 1 },
  acciones: { gap: spacing.sm },
});
