import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useCitasProximas } from '@/features/citas/hooks/useCitasProximas';

export default function ListaCitas() {
  const { colors } = useTheme();
  const router = useRouter();
  const { citas } = useCitasProximas();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Button label="Nueva cita" onPress={() => router.push('/cita/nueva')} />

      <FlatList
        data={citas}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <Text style={[typography.body, { color: colors.textSecondary }]}>No hay citas próximas.</Text>
        }
        renderItem={({ item }) => (
          <Card>
            <Text style={[typography.body, { color: colors.text }]}>{item.titulo}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {new Date(item.fechaHora).toLocaleString('es-ES')}
              {item.lugar ? ` — ${item.lugar}` : ''}
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
