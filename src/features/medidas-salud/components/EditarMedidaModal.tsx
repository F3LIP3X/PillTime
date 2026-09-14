import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { DateTimeField } from '@/components/DateTimeField';
import { HojaModal } from '@/components/HojaModal';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import type { DatosMedida } from '../hooks/useMedidasSalud';
import { INFO_MEDIDA, validarValores, type Medida } from '../tipos';
import { CamposMedida, type ValoresFormularioMedida } from './CamposMedida';
import { aDatosMedida } from './datosMedida';

type Props = {
  medida: Medida | null;
  onClose: () => void;
  onGuardar: (id: number, datos: DatosMedida) => Promise<void>;
  onEliminar: (id: number) => Promise<void>;
};

export function EditarMedidaModal({ medida, onClose, onGuardar, onEliminar }: Props) {
  const { colors } = useTheme();
  const [fecha, setFecha] = useState(new Date());
  const [valores, setValores] = useState<ValoresFormularioMedida>({ textos: [], notas: '' });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!medida) return;
    setFecha(new Date(medida.fechaHora));
    const texto = (v: number | null) => (v === null ? '' : String(v).replace('.', ','));
    setValores({
      textos: [texto(medida.valor1), texto(medida.valor2), texto(medida.valor3)],
      // Un síntoma antiguo guardaba un número: se ofrece como texto para describirlo.
      notas: medida.notas ?? (medida.tipo === 'sintoma' && medida.valor1 !== null ? String(medida.valor1) : ''),
    });
  }, [medida]);

  if (!medida) return null;

  const error = validarValores(medida.tipo, valores.textos, valores.notas);

  const handleGuardar = async () => {
    if (error) return;
    setGuardando(true);
    try {
      await onGuardar(medida.id, aDatosMedida(medida.tipo, valores, fecha));
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
    <HojaModal visible titulo={`Editar · ${INFO_MEDIDA[medida.tipo].etiqueta}`} onClose={onClose}>
      <CamposMedida tipo={medida.tipo} valor={valores} onChange={setValores} />
      {!!error && <Text style={[typography.caption, { color: colors.error }]}>{error}</Text>}

      <View style={styles.fila}>
        <View style={styles.campoFlexible}>
          <DateTimeField label="Fecha" mode="date" value={fecha} onChange={setFecha} />
        </View>
        <View style={styles.campoFlexible}>
          <DateTimeField label="Hora" mode="time" value={fecha} onChange={setFecha} />
        </View>
      </View>

      <View style={styles.acciones}>
        <Button label={guardando ? 'Guardando…' : 'Guardar cambios'} onPress={handleGuardar} disabled={guardando || !!error} />
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
