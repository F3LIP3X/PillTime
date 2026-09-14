import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { CalendarClock, MapPin, Plus } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { PieAccion } from '@/components/PieAccion';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { IconoCircular } from '@/components/IconoCircular';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useCitasProximas } from '@/features/citas/hooks/useCitasProximas';

export default function ListaCitas() {
  const { colors } = useTheme();
  const router = useRouter();
  const { citas, recargar } = useCitasProximas();

  useFocusEffect(
    useCallback(() => {
      recargar();
    }, [recargar]),
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={citas}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icono={<CalendarClock color={colors.primary} size={30} />}
            titulo="Sin citas próximas"
            descripcion="Apunta una consulta y te avisaremos cuando se acerque."
          />
        }
        renderItem={({ item }) => {
          const fecha = new Date(item.fechaHora);
          return (
            <Card style={styles.tarjeta}>
              <View style={styles.fila}>
                <IconoCircular>
                  <CalendarClock color={colors.primary} size={20} />
                </IconoCircular>
                <View style={styles.textos}>
                  <Text style={[typography.bodyStrong, { color: colors.text }]}>{item.titulo}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
                    {fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {!!item.lugar && (
                    <View style={styles.lugarFila}>
                      <MapPin color={colors.textTertiary} size={13} />
                      <Text style={[typography.caption, { color: colors.textTertiary }]}>{item.lugar}</Text>
                    </View>
                  )}
                </View>
              </View>
            </Card>
          );
        }}
      />

      <PieAccion>
        <Button
          label="Nueva cita"
          icono={<Plus color={colors.onPrimary} size={18} />}
          onPress={() => router.push('/cita/nueva')}
        />
      </PieAccion>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.lg, flexGrow: 1 },
  tarjeta: { marginBottom: spacing.sm },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  textos: { flex: 1, gap: 3 },
  lugarFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
