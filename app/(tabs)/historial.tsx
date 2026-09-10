import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { Pencil } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useDb } from '@/db/client';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useHistorial, type ItemHistorial } from '@/features/historial/hooks/useHistorial';
import { exportarHistorialAPdf } from '@/features/pdf/exportarHistorial';
import { EditarTomaModal } from '@/features/tomas/components/EditarTomaModal';

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: 'Pendiente',
  tomado: 'Tomado',
  omitido: 'Omitido',
  pospuesto: 'Pospuesto',
};

export default function Historial() {
  const { colors } = useTheme();
  const db = useDb();
  const { historial, recargar } = useHistorial();
  const [exportando, setExportando] = useState(false);
  const [tomaEditando, setTomaEditando] = useState<ItemHistorial | null>(null);

  const handleExportar = async () => {
    setExportando(true);
    try {
      const uri = await exportarHistorialAPdf(db);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      } else {
        Alert.alert('No se puede compartir', 'Este dispositivo no admite compartir archivos.');
      }
    } catch (error) {
      console.warn('Error exportando/compartiendo el PDF:', error);
      Alert.alert('No se pudo exportar', 'Ocurrió un problema generando o compartiendo el PDF.');
    } finally {
      setExportando(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Button
        label={exportando ? 'Generando PDF…' : 'Exportar historial a PDF'}
        onPress={handleExportar}
        variant="secondary"
      />

      <FlatList
        data={historial}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <Text style={[typography.body, { color: colors.textSecondary }]}>Aún no hay tomas registradas.</Text>
        }
        renderItem={({ item }) => (
          <Card>
            <View style={styles.cabecera}>
              <Text style={[typography.body, { color: colors.text }]}>{item.nombreMedicamento}</Text>
              <Pressable
                onPress={() => setTomaEditando(item)}
                accessibilityRole="button"
                accessibilityLabel="Editar toma"
                hitSlop={8}
              >
                <Pencil color={colors.textSecondary} size={16} />
              </Pressable>
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {new Date(item.fechaHoraProgramada).toLocaleString('es-ES')} — {ETIQUETA_ESTADO[item.estado]}
              {item.motivoOmision ? ` (${item.motivoOmision})` : ''}
            </Text>
          </Card>
        )}
      />

      <EditarTomaModal toma={tomaEditando} onClose={() => setTomaEditando(null)} onCambiado={recargar} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, gap: spacing.md },
  lista: { gap: spacing.sm, flexGrow: 1 },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
