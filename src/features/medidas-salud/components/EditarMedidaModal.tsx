import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateTimeField } from '@/components/DateTimeField';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type MedidaEditable = {
  id: number;
  valor1: number | null;
  valor2: number | null;
  fechaHora: string;
};

type Props = {
  medida: MedidaEditable | null;
  esTension: boolean;
  onClose: () => void;
  onGuardar: (id: number, datos: { valor1?: number; valor2?: number; fechaHora: string }) => Promise<void>;
  onEliminar: (id: number) => Promise<void>;
};

export function EditarMedidaModal({ medida, esTension, onClose, onGuardar, onEliminar }: Props) {
  const { colors } = useTheme();

  const [fecha, setFecha] = useState(new Date());
  const [valor1, setValor1] = useState('');
  const [valor2, setValor2] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!medida) return;
    setFecha(new Date(medida.fechaHora));
    setValor1(medida.valor1 != null ? String(medida.valor1) : '');
    setValor2(medida.valor2 != null ? String(medida.valor2) : '');
  }, [medida]);

  if (!medida) return null;

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      await onGuardar(medida.id, {
        valor1: Number(valor1.replace(',', '.')) || undefined,
        valor2: esTension ? Number(valor2.replace(',', '.')) || undefined : undefined,
        fechaHora: fecha.toISOString(),
      });
      onClose();
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = () => {
    Alert.alert('Eliminar registro', '¿Eliminar este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await onEliminar(medida.id);
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.fondo} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Card style={styles.tarjeta}>
            <Text style={[typography.subtitle, { color: colors.text }]}>Editar registro</Text>

            <TextField label={esTension ? 'Sistólica' : 'Valor'} keyboardType="numeric" value={valor1} onChangeText={setValor1} />
            {esTension && (
              <TextField label="Diastólica" keyboardType="numeric" value={valor2} onChangeText={setValor2} />
            )}

            <DateTimeField label="Fecha" mode="date" value={fecha} onChange={setFecha} />
            <DateTimeField label="Hora" mode="time" value={fecha} onChange={setFecha} />

            <Button label={guardando ? 'Guardando…' : 'Guardar cambios'} onPress={handleGuardar} />
            <Button label="Eliminar registro" variant="secondary" onPress={handleEliminar} />
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#00000088', justifyContent: 'center', padding: spacing.lg },
  tarjeta: { gap: spacing.sm },
});
