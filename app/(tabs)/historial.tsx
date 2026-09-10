import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useDb } from '@/db/client';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useHistorial } from '@/features/historial/hooks/useHistorial';
import { exportarHistorialAPdf } from '@/features/pdf/exportarHistorial';

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: 'Pendiente',
  tomado: 'Tomado',
  omitido: 'Omitido',
  pospuesto: 'Pospuesto',
};

export default function Historial() {
  const { colors } = useTheme();
  const db = useDb();
  const { historial } = useHistorial();
  const [exportando, setExportando] = useState(false);

  const handleExportar = async () => {
    setExportando(true);
    try {
      const uri = await exportarHistorialAPdf(db);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      }
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
            <Text style={[typography.body, { color: colors.text }]}>{item.nombreMedicamento}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {new Date(item.fechaHoraProgramada).toLocaleString('es-ES')} — {ETIQUETA_ESTADO[item.estado]}
              {item.motivoOmision ? ` (${item.motivoOmision})` : ''}
            </Text>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, gap: spacing.md },
  lista: { gap: spacing.sm, flexGrow: 1 },
});
