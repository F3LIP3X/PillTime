import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { PieAccion } from '@/components/PieAccion';
import { Card } from '@/components/Card';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { MOMENTO_COMIDA, type MomentoComida } from '@/db/schema';
import { useMedicamento } from '@/features/medicamentos/hooks/useMedicamento';
import { useActualizarMedicamento } from '@/features/medicamentos/hooks/useActualizarMedicamento';

const ETIQUETA_MOMENTO: Record<MomentoComida, string> = {
  antes: 'Antes',
  despues: 'Después',
  ninguno: 'Indiferente',
};

export default function EditarMedicamento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const medicamentoId = Number(id);
  const router = useRouter();
  const { colors } = useTheme();
  const { medicamento } = useMedicamento(medicamentoId);
  const actualizar = useActualizarMedicamento();

  const [nombre, setNombre] = useState('');
  const [dosis, setDosis] = useState('');
  const [unidadesPorToma, setUnidadesPorToma] = useState('1');
  const [stockInicial, setStockInicial] = useState('0');
  const [momentoComida, setMomentoComida] = useState<MomentoComida>('ninguno');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!medicamento) return;
    setNombre(medicamento.nombre);
    setDosis(medicamento.dosis);
    setUnidadesPorToma(String(medicamento.unidadesPorToma));
    setStockInicial(String(medicamento.stockInicial));
    setMomentoComida(medicamento.momentoComida ?? 'ninguno');
    setNotas(medicamento.notas ?? '');
  }, [medicamento]);

  const puedeGuardar = nombre.trim().length > 0 && dosis.trim().length > 0;

  const handleGuardar = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    try {
      await actualizar(medicamentoId, {
        nombre: nombre.trim(),
        dosis: dosis.trim(),
        unidadesPorToma: Number(unidadesPorToma) || 1,
        stockInicial: Number(stockInicial) || 0,
        momentoComida,
        notas: notas.trim() || undefined,
      });
      router.back();
    } finally {
      setGuardando(false);
    }
  };

  if (!medicamento) return null;

  return (
    <View style={[styles.pantalla, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.grupo}>
          <Text style={[typography.overline, styles.tituloGrupo, { color: colors.textTertiary }]}>Medicamento</Text>
          <Card>
            <TextField label="Nombre" value={nombre} onChangeText={setNombre} />
            <TextField label="Dosis" value={dosis} onChangeText={setDosis} />

            <View style={styles.fila}>
              <View style={styles.campoFlexible}>
                <TextField
                  label="Unidades por toma"
                  keyboardType="numeric"
                  value={unidadesPorToma}
                  onChangeText={setUnidadesPorToma}
                />
              </View>
              <View style={styles.campoFlexible}>
                <TextField
                  label="Unidades en la caja"
                  keyboardType="numeric"
                  value={stockInicial}
                  onChangeText={setStockInicial}
                />
              </View>
            </View>

            <View style={styles.bloque}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Con la comida</Text>
              <SegmentedControl
                opciones={MOMENTO_COMIDA.map((m) => ({ valor: m, etiqueta: ETIQUETA_MOMENTO[m] }))}
                valor={momentoComida}
                onChange={setMomentoComida}
              />
            </View>
          </Card>
        </View>

        <View style={styles.grupo}>
          <Text style={[typography.overline, styles.tituloGrupo, { color: colors.textTertiary }]}>Notas</Text>
          <Card>
            <TextField label="Notas y alertas" value={notas} onChangeText={setNotas} multiline style={styles.notas} />
          </Card>
        </View>
      </ScrollView>

      <PieAccion>
        <Button
          label={guardando ? 'Guardando…' : 'Guardar cambios'}
          onPress={handleGuardar}
          disabled={!puedeGuardar || guardando}
        />
      </PieAccion>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  container: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
  grupo: { gap: spacing.sm },
  tituloGrupo: { marginLeft: spacing.xs },
  fila: { flexDirection: 'row', gap: spacing.md },
  campoFlexible: { flex: 1 },
  bloque: { gap: spacing.xs, marginTop: spacing.xs },
  notas: { minHeight: 88, textAlignVertical: 'top', paddingTop: spacing.sm },
});
