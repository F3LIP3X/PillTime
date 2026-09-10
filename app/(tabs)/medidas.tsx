import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { TIPO_MEDIDA_SALUD, type TipoMedidaSalud } from '@/db/schema';
import { useMedidasSalud } from '@/features/medidas-salud/hooks/useMedidasSalud';

const ETIQUETA_TIPO: Record<TipoMedidaSalud, string> = {
  peso: 'Peso',
  tension: 'Tensión',
  glucosa: 'Glucosa',
  sintoma: 'Síntoma',
  animo: 'Ánimo',
};

export default function Medidas() {
  const { colors, esOscuro } = useTheme();
  const [tipo, setTipo] = useState<TipoMedidaSalud>('peso');
  const [valor1, setValor1] = useState('');
  const [valor2, setValor2] = useState('');
  const { medidas, registrar } = useMedidasSalud(tipo);

  const esTension = tipo === 'tension';

  const handleRegistrar = async () => {
    const numero1 = Number(valor1.replace(',', '.'));
    if (!numero1) return;
    await registrar({
      valor1: numero1,
      valor2: esTension ? Number(valor2.replace(',', '.')) || undefined : undefined,
      fechaHora: new Date().toISOString(),
    });
    setValor1('');
    setValor2('');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.tabs}>
        {TIPO_MEDIDA_SALUD.map((t) => (
          <Pressable
            key={t}
            onPress={() => setTipo(t)}
            accessibilityRole="button"
            accessibilityLabel={ETIQUETA_TIPO[t]}
            style={[
              styles.tab,
              {
                backgroundColor: tipo === t ? colors.primary : esOscuro ? '#1B2626' : '#FFFFFF',
                borderColor: colors.textSecondary + '33',
              },
            ]}
          >
            <Text style={[typography.bodySmall, { color: tipo === t ? '#FFFFFF' : colors.text }]}>
              {ETIQUETA_TIPO[t]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Card style={styles.form}>
        <TextField
          label={esTension ? 'Sistólica' : ETIQUETA_TIPO[tipo]}
          keyboardType="numeric"
          value={valor1}
          onChangeText={setValor1}
        />
        {esTension && (
          <TextField label="Diastólica" keyboardType="numeric" value={valor2} onChangeText={setValor2} />
        )}
        <Button label="Registrar" onPress={handleRegistrar} />
      </Card>

      <FlatList
        data={medidas}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <Text style={[typography.body, { color: colors.textSecondary }]}>Sin registros todavía.</Text>
        }
        renderItem={({ item }) => (
          <Card>
            <Text style={[typography.body, { color: colors.text }]}>
              {item.valor1}
              {item.valor2 ? ` / ${item.valor2}` : ''}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {new Date(item.fechaHora).toLocaleString('es-ES')}
            </Text>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, gap: spacing.md },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  form: { gap: spacing.sm },
  lista: { gap: spacing.sm, flexGrow: 1 },
});
