import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { MOMENTO_COMIDA, type MomentoComida } from '@/db/schema';
import { useMedicamento } from '@/features/medicamentos/hooks/useMedicamento';
import { useActualizarMedicamento } from '@/features/medicamentos/hooks/useActualizarMedicamento';

const ETIQUETA_MOMENTO: Record<MomentoComida, string> = {
  antes: 'Antes de comer',
  despues: 'Después de comer',
  ninguno: 'Indiferente',
};

export default function EditarMedicamento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const medicamentoId = Number(id);
  const router = useRouter();
  const { colors, esOscuro } = useTheme();
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

  const handleGuardar = async () => {
    if (!nombre.trim() || !dosis.trim()) return;
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
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <TextField label="Nombre" value={nombre} onChangeText={setNombre} />
      <TextField label="Dosis" value={dosis} onChangeText={setDosis} />

      <View style={styles.fila}>
        <TextField
          label="Unidades por toma"
          keyboardType="numeric"
          value={unidadesPorToma}
          onChangeText={setUnidadesPorToma}
          style={styles.mitad}
        />
        <TextField
          label="Stock inicial"
          keyboardType="numeric"
          value={stockInicial}
          onChangeText={setStockInicial}
          style={styles.mitad}
        />
      </View>

      <View>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Con la comida</Text>
        <View style={styles.opciones}>
          {MOMENTO_COMIDA.map((momento) => (
            <Pressable
              key={momento}
              onPress={() => setMomentoComida(momento)}
              accessibilityRole="radio"
              accessibilityState={{ checked: momentoComida === momento }}
              style={[
                styles.chip,
                {
                  backgroundColor: momentoComida === momento ? colors.primary : esOscuro ? '#1B2626' : '#FFFFFF',
                  borderColor: colors.textSecondary + '33',
                },
              ]}
            >
              <Text style={[typography.bodySmall, { color: momentoComida === momento ? '#FFFFFF' : colors.text }]}>
                {ETIQUETA_MOMENTO[momento]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <TextField label="Notas / alertas (opcional)" value={notas} onChangeText={setNotas} multiline style={styles.notas} />

      <Button label={guardando ? 'Guardando…' : 'Guardar cambios'} onPress={handleGuardar} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  fila: { flexDirection: 'row', gap: spacing.md },
  mitad: { flex: 1 },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  notas: { minHeight: 80 },
});
