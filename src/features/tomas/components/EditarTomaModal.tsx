import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { DateTimeField } from '@/components/DateTimeField';
import { HojaModal } from '@/components/HojaModal';
import { SegmentedControl } from '@/components/SegmentedControl';
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
  eliminada: 'Eliminada', // no seleccionable (ver filtro más abajo), solo para completar el tipo.
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
  const { colors } = useTheme();
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
    <HojaModal visible titulo={toma.nombreMedicamento} onClose={onClose}>
      <View style={styles.fila}>
        <View style={styles.campoFlexible}>
          <DateTimeField label="Fecha" mode="date" value={fecha} onChange={setFecha} />
        </View>
        <View style={styles.campoFlexible}>
          <DateTimeField label="Hora" mode="time" value={fecha} onChange={setFecha} />
        </View>
      </View>

      <View style={styles.bloque}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Estado</Text>
        {/* 'eliminada' es un tombstone interno (ver schema.ts), nunca seleccionable a mano. */}
        <SegmentedControl
          opciones={ESTADO_TOMA.filter((e) => e !== 'eliminada').map((e) => ({
            valor: e,
            etiqueta: ETIQUETA_ESTADO[e],
          }))}
          valor={estado}
          onChange={setEstado}
          desplazable
        />
      </View>

      {estado === 'omitido' && <TextField label="Motivo (opcional)" value={motivo} onChangeText={setMotivo} />}

      <View style={styles.acciones}>
        <Button label={guardando ? 'Guardando…' : 'Guardar cambios'} onPress={handleGuardar} disabled={guardando} />
        <Button
          label="Eliminar toma"
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
  bloque: { gap: spacing.xs },
  acciones: { gap: spacing.sm, marginTop: spacing.xs },
});
