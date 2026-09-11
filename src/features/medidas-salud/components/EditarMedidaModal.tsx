import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { DateTimeField } from '@/components/DateTimeField';
import { HojaModal } from '@/components/HojaModal';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';

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
    <HojaModal visible titulo="Editar registro" onClose={onClose}>
      <View style={styles.fila}>
        <View style={styles.campoFlexible}>
          <TextField
            label={esTension ? 'Sistólica' : 'Valor'}
            keyboardType="numeric"
            value={valor1}
            onChangeText={setValor1}
          />
        </View>
        {esTension && (
          <View style={styles.campoFlexible}>
            <TextField label="Diastólica" keyboardType="numeric" value={valor2} onChangeText={setValor2} />
          </View>
        )}
      </View>

      <View style={styles.fila}>
        <View style={styles.campoFlexible}>
          <DateTimeField label="Fecha" mode="date" value={fecha} onChange={setFecha} />
        </View>
        <View style={styles.campoFlexible}>
          <DateTimeField label="Hora" mode="time" value={fecha} onChange={setFecha} />
        </View>
      </View>

      <View style={styles.acciones}>
        <Button label={guardando ? 'Guardando…' : 'Guardar cambios'} onPress={handleGuardar} disabled={guardando} />
        <Button
          label="Eliminar registro"
          variant="danger"
          icono={<Trash2 color={colors.error} size={18} />}
          onPress={handleEliminar}
        />
      </View>
    </HojaModal>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: spacing.md },
  campoFlexible: { flex: 1 },
  acciones: { gap: spacing.sm, marginTop: spacing.xs },
});
