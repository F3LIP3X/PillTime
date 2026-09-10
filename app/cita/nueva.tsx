import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { DateTimeField } from '@/components/DateTimeField';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { useCitasProximas } from '@/features/citas/hooks/useCitasProximas';

export default function NuevaCita() {
  const { colors } = useTheme();
  const router = useRouter();
  const { crear } = useCitasProximas();

  const [titulo, setTitulo] = useState('');
  const [lugar, setLugar] = useState('');
  const [fechaHora, setFechaHora] = useState(new Date());

  const handleGuardar = async () => {
    if (!titulo.trim()) return;
    await crear({ titulo: titulo.trim(), lugar: lugar.trim() || undefined, fechaHora: fechaHora.toISOString() });
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TextField label="Motivo de la cita" value={titulo} onChangeText={setTitulo} />
      <TextField label="Lugar (opcional)" value={lugar} onChangeText={setLugar} />
      <View style={styles.fila}>
        <DateTimeField label="Fecha" mode="date" value={fechaHora} onChange={setFechaHora} />
        <DateTimeField label="Hora" mode="time" value={fechaHora} onChange={setFechaHora} />
      </View>
      <Button label="Guardar cita" onPress={handleGuardar} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, gap: spacing.md },
  fila: { flexDirection: 'row', gap: spacing.md },
});
