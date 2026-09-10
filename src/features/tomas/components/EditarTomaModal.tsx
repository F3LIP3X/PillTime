import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateTimeField } from '@/components/DateTimeField';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { ESTADO_TOMA, type EstadoToma } from '@/db/schema';
import { useActualizarToma, useEliminarToma } from '@/features/tomas/hooks/useEditarToma';

const ETIQUETA_ESTADO: Record<EstadoToma, string> = {
  pendiente: 'Pendiente',
  tomado: 'Tomado',
  omitido: 'Omitido',
  pospuesto: 'Pospuesto',
};

type TomaEditable = {
  id: number;
  nombreMedicamento: string;
  fechaHoraProgramada: string;
  estado: EstadoToma;
  motivoOmision?: string | null;
};

type Props = {
  toma: TomaEditable | null;
  onClose: () => void;
  onCambiado: () => void;
};

export function EditarTomaModal({ toma, onClose, onCambiado }: Props) {
  const { colors, esOscuro } = useTheme();
  const actualizar = useActualizarToma();
  const eliminar = useEliminarToma();

  const [fecha, setFecha] = useState(new Date());
  const [estado, setEstado] = useState<EstadoToma>('pendiente');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!toma) return;
    setFecha(new Date(toma.fechaHoraProgramada));
    setEstado(toma.estado);
    setMotivo(toma.motivoOmision ?? '');
  }, [toma]);

  if (!toma) return null;

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      await actualizar(toma.id, {
        fechaHoraProgramada: fecha.toISOString(),
        estado,
        motivoOmision: motivo.trim() || undefined,
      });
      onCambiado();
      onClose();
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = () => {
    Alert.alert('Eliminar toma', `¿Eliminar la toma de ${toma.nombreMedicamento}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await eliminar(toma.id);
          onCambiado();
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
            <Text style={[typography.subtitle, { color: colors.text }]}>{toma.nombreMedicamento}</Text>

            <View style={styles.fila}>
              <DateTimeField label="Fecha" mode="date" value={fecha} onChange={setFecha} />
              <DateTimeField label="Hora" mode="time" value={fecha} onChange={setFecha} />
            </View>

            <Text style={[typography.caption, { color: colors.textSecondary }]}>Estado</Text>
            <View style={styles.opciones}>
              {ESTADO_TOMA.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => setEstado(e)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: estado === e }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: estado === e ? colors.primary : esOscuro ? '#1B2626' : '#FFFFFF',
                      borderColor: colors.textSecondary + '33',
                    },
                  ]}
                >
                  <Text style={[typography.bodySmall, { color: estado === e ? '#FFFFFF' : colors.text }]}>
                    {ETIQUETA_ESTADO[e]}
                  </Text>
                </Pressable>
              ))}
            </View>

            {estado === 'omitido' && (
              <TextField label="Motivo (opcional)" value={motivo} onChangeText={setMotivo} />
            )}

            <Button label={guardando ? 'Guardando…' : 'Guardar cambios'} onPress={handleGuardar} />
            <Button label="Eliminar toma" variant="secondary" onPress={handleEliminar} />
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#00000088', justifyContent: 'center', padding: spacing.lg },
  tarjeta: { gap: spacing.sm },
  fila: { flexDirection: 'row', gap: spacing.md },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
});
