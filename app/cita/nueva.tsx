import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
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
  const [guardando, setGuardando] = useState(false);

  const handleGuardar = async () => {
    if (!titulo.trim()) return;
    setGuardando(true);
    try {
      await crear({ titulo: titulo.trim(), lugar: lugar.trim() || undefined, fechaHora: fechaHora.toISOString() });
      router.back();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={[styles.pantalla, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Card>
          <TextField
            label="Motivo de la cita"
            value={titulo}
            onChangeText={setTitulo}
            placeholder="Revisión con el cardiólogo"
          />
          <TextField label="Lugar (opcional)" value={lugar} onChangeText={setLugar} placeholder="Centro de salud" />
          <View style={styles.fila}>
            <View style={styles.campoFlexible}>
              <DateTimeField label="Fecha" mode="date" value={fechaHora} onChange={setFechaHora} />
            </View>
            <View style={styles.campoFlexible}>
              <DateTimeField label="Hora" mode="time" value={fechaHora} onChange={setFechaHora} />
            </View>
          </View>
        </Card>
      </ScrollView>

      <View style={[styles.pieAccion, { backgroundColor: colors.background, borderTopColor: colors.separator }]}>
        <Button
          label={guardando ? 'Guardando…' : 'Guardar cita'}
          onPress={handleGuardar}
          disabled={!titulo.trim() || guardando}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  container: { padding: spacing.md, gap: spacing.md },
  fila: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  campoFlexible: { flex: 1 },
  pieAccion: { padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
