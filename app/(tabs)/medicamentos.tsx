import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useMedicamentos } from '@/features/medicamentos/hooks/useMedicamentos';

export default function Medicamentos() {
  const { colors, esOscuro } = useTheme();
  const router = useRouter();
  const [verArchivados, setVerArchivados] = useState(false);
  const { medicamentos, recargar } = useMedicamentos({ soloActivos: !verArchivados });

  useFocusEffect(
    useCallback(() => {
      recargar();
    }, [recargar]),
  );

  const lista = verArchivados ? medicamentos.filter((m) => !m.activo) : medicamentos;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.tabs}>
        <Pressable
          onPress={() => setVerArchivados(false)}
          accessibilityRole="button"
          accessibilityLabel="Activos"
          style={[
            styles.tab,
            {
              backgroundColor: !verArchivados ? colors.primary : esOscuro ? '#1B2626' : '#FFFFFF',
              borderColor: colors.textSecondary + '33',
            },
          ]}
        >
          <Text style={[typography.bodySmall, { color: !verArchivados ? '#FFFFFF' : colors.text }]}>Activos</Text>
        </Pressable>
        <Pressable
          onPress={() => setVerArchivados(true)}
          accessibilityRole="button"
          accessibilityLabel="Archivados"
          style={[
            styles.tab,
            {
              backgroundColor: verArchivados ? colors.primary : esOscuro ? '#1B2626' : '#FFFFFF',
              borderColor: colors.textSecondary + '33',
            },
          ]}
        >
          <Text style={[typography.bodySmall, { color: verArchivados ? '#FFFFFF' : colors.text }]}>Archivados</Text>
        </Pressable>
      </View>

      <FlatList
        data={lista}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            {verArchivados ? 'No hay medicamentos archivados.' : 'No has añadido ningún medicamento todavía.'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/medicamento/${item.id}/detalle`)}>
            <Card style={styles.fila}>
              <View style={styles.info}>
                <Text style={[typography.body, { color: colors.text }]}>{item.nombre}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {item.dosis} — {item.stockRestante} unidades
                </Text>
              </View>
              <ChevronRight color={colors.textSecondary} size={20} />
            </Card>
          </Pressable>
        )}
      />

      <Button
        label="Añadir medicamento"
        onPress={() => router.push('/medicamento/nuevo')}
        accessibilityLabel="Añadir medicamento"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, gap: spacing.md },
  tabs: { flexDirection: 'row', gap: spacing.xs },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  lista: { gap: spacing.sm, flexGrow: 1 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  info: { flex: 1, gap: spacing.xs },
});
