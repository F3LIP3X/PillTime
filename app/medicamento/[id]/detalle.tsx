import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Archive, CalendarDays, Clock, FileText, Package, Pencil, Pill, Utensils } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconoCircular } from '@/components/IconoCircular';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';
import { useMedicamento } from '@/features/medicamentos/hooks/useMedicamento';
import { useMedicamentos } from '@/features/medicamentos/hooks/useMedicamentos';
import { useArchivarMedicamento } from '@/features/medicamentos/hooks/useActualizarMedicamento';

const ETIQUETA_MOMENTO: Record<string, string> = {
  antes: 'Antes de comer',
  despues: 'Después de comer',
  ninguno: 'Indiferente con las comidas',
};

const ETIQUETA_DIA: Record<number, string> = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 7: 'D' };

const UMBRAL_STOCK_BAJO = 5;

export default function DetalleMedicamento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const medicamentoId = Number(id);
  const router = useRouter();
  const { colors } = useTheme();
  const { medicamento, horarios, recargar: recargarMedicamento } = useMedicamento(medicamentoId);
  const { medicamentos: conStock, recargar: recargarStock } = useMedicamentos({ soloActivos: false });
  const archivar = useArchivarMedicamento();

  const stock = conStock.find((m) => m.id === medicamentoId);

  // Expo Router no desmonta esta pantalla al volver de "Editar" (usa
  // router.back()), así que un fetch de solo-montaje se quedaría con los
  // datos viejos. Se refresca cada vez que la pantalla recupera el foco.
  useFocusEffect(
    useCallback(() => {
      recargarMedicamento();
      recargarStock();
    }, [recargarMedicamento, recargarStock]),
  );

  if (!medicamento) return null;

  const unidadesRestantes = stock ? stock.stockRestante : medicamento.stockInicial;
  const stockBajo = unidadesRestantes <= UMBRAL_STOCK_BAJO;

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
  separador: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  notas: { flex: 1 },
  acciones: { gap: spacing.sm },
});
