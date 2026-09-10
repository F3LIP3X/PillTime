import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pencil } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useTomasDeHoy, type TomaDeHoy } from '@/features/tomas/hooks/useTomasDeHoy';
import { useAsegurarTomasDeHoy } from '@/features/tomas/hooks/useAsegurarTomasDeHoy';
import { useMarcarToma } from '@/features/tomas/hooks/useMarcarToma';
import { useMedicamentos } from '@/features/medicamentos/hooks/useMedicamentos';
import { EditarTomaModal } from '@/features/tomas/components/EditarTomaModal';

const UMBRAL_STOCK_BAJO = 5;

function horaDe(fechaIso: string) {
  return new Date(fechaIso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export default function Inicio() {
  const { colors } = useTheme();
  const router = useRouter();
  const asegurarTomasDeHoy = useAsegurarTomasDeHoy();
  const { tomasDeHoy, recargar: recargarTomas } = useTomasDeHoy();
  const { medicamentos } = useMedicamentos();
  const { marcarTomado, marcarOmitido } = useMarcarToma();
  const [tomaEditando, setTomaEditando] = useState<TomaDeHoy | null>(null);

  const medicamentosConStockBajo = medicamentos.filter((m) => m.stockRestante <= UMBRAL_STOCK_BAJO);

  useFocusEffect(
    useCallback(() => {
      asegurarTomasDeHoy().then(recargarTomas);
    }, [asegurarTomasDeHoy, recargarTomas]),
  );

  const handleMarcar = async (toma: TomaDeHoy, tomado: boolean) => {
    if (tomado) await marcarTomado(toma.id);
    else await marcarOmitido(toma.id);
    await recargarTomas();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {medicamentosConStockBajo.length > 0 && (
        <Card style={{ borderColor: colors.error }}>
          <Text style={[typography.bodySmall, { color: colors.error, fontWeight: '600' }]}>
            Quedan pocas unidades
          </Text>
          {medicamentosConStockBajo.map((m) => (
            <Text key={m.id} style={[typography.bodySmall, { color: colors.text }]}>
              {m.nombre}: {m.stockRestante} unidades
            </Text>
          ))}
        </Card>
      )}

      <FlatList
        data={tomasDeHoy}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            No hay tomas programadas para hoy.
          </Text>
        }
        renderItem={({ item }) => (
          <Card>
            <View style={styles.cabecera}>
              <Text style={[typography.subtitle, { color: colors.text }]}>{horaDe(item.fechaHoraProgramada)}</Text>
              <Pressable
                onPress={() => setTomaEditando(item)}
                accessibilityRole="button"
                accessibilityLabel="Editar toma"
                hitSlop={8}
              >
                <Pencil color={colors.textSecondary} size={18} />
              </Pressable>
            </View>
            <Text style={[typography.body, { color: colors.text }]}>
              {item.nombreMedicamento} — {item.dosis}
            </Text>
            {item.estado === 'pendiente' ? (
              <View style={styles.acciones}>
                <Button label="Tomado" onPress={() => handleMarcar(item, true)} />
                <Button label="Omitir" variant="secondary" onPress={() => handleMarcar(item, false)} />
              </View>
            ) : (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {item.estado === 'tomado' ? 'Tomado' : 'Omitido'}
              </Text>
            )}
          </Card>
        )}
      />

      <Button
        label="Añadir medicamento"
        onPress={() => router.push('/medicamento/nuevo')}
        accessibilityLabel="Añadir medicamento"
      />

      <EditarTomaModal
        toma={tomaEditando}
        onClose={() => setTomaEditando(null)}
        onCambiado={recargarTomas}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, gap: spacing.md },
  lista: { gap: spacing.sm, flexGrow: 1 },
  acciones: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
