import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useMedicamento } from '@/features/medicamentos/hooks/useMedicamento';
import { useMedicamentos } from '@/features/medicamentos/hooks/useMedicamentos';
import { useArchivarMedicamento } from '@/features/medicamentos/hooks/useActualizarMedicamento';

const ETIQUETA_MOMENTO: Record<string, string> = {
  antes: 'Antes de comer',
  despues: 'Después de comer',
  ninguno: 'Indiferente',
};

const ETIQUETA_DIA: Record<number, string> = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 7: 'D' };

export default function DetalleMedicamento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const medicamentoId = Number(id);
  const router = useRouter();
  const { colors } = useTheme();
  const { medicamento, horarios } = useMedicamento(medicamentoId);
  const { medicamentos: conStock } = useMedicamentos({ soloActivos: false });
  const archivar = useArchivarMedicamento();

  const stock = conStock.find((m) => m.id === medicamentoId);

  if (!medicamento) return null;

  const handleArchivar = async () => {
    await archivar(medicamentoId);
    router.back();
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={[typography.title, { color: colors.text }]}>{medicamento.nombre}</Text>
      <Text style={[typography.body, { color: colors.textSecondary }]}>{medicamento.dosis}</Text>

      <Card>
        <Text style={[typography.body, { color: colors.text }]}>
          Stock restante: {stock ? stock.stockRestante : medicamento.stockInicial} unidades
        </Text>
        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
          {ETIQUETA_MOMENTO[medicamento.momentoComida ?? 'ninguno']}
        </Text>
      </Card>

      <Card>
        <Text style={[typography.subtitle, { color: colors.text }]}>Horarios</Text>
        {horarios.map((horario) =>
          horario.tipo === 'semanal' ? (
            <Text key={horario.id} style={[typography.body, { color: colors.text }]}>
              {horario.hora} —{' '}
              {horario.diasSemana!
                .split(',')
                .map((d) => ETIQUETA_DIA[Number(d)])
                .join(' ')}
            </Text>
          ) : (
            <Text key={horario.id} style={[typography.body, { color: colors.text }]}>
              Cada {horario.frecuenciaHoras}h durante {horario.duracionDias}{' '}
              {horario.duracionDias === 1 ? 'día' : 'días'} — desde{' '}
              {new Date(horario.fechaHoraInicio!).toLocaleString('es-ES')}
            </Text>
          ),
        )}
      </Card>

      {!!medicamento.notas && (
        <Card>
          <Text style={[typography.subtitle, { color: colors.text }]}>Notas</Text>
          <Text style={[typography.body, { color: colors.text }]}>{medicamento.notas}</Text>
        </Card>
      )}

      <Button label="Editar" onPress={() => router.push(`/medicamento/${medicamentoId}/editar`)} />
      {medicamento.activo && <Button label="Archivar" variant="secondary" onPress={handleArchivar} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
});
