import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pencil } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useProximaTomaPorMedicamento, type ProximaToma } from '@/features/tomas/hooks/useProximaTomaPorMedicamento';
import { useAsegurarTomasDeHoy } from '@/features/tomas/hooks/useAsegurarTomasDeHoy';
import { useMarcarToma } from '@/features/tomas/hooks/useMarcarToma';
import { useMedicamentos } from '@/features/medicamentos/hooks/useMedicamentos';
import { EditarTomaModal } from '@/features/tomas/components/EditarTomaModal';

const UMBRAL_STOCK_BAJO = 5;

function esMismoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "Hoy 09:00", "Mañana 09:00", "Ayer 09:00" o la fecha completa si está más lejos. */
function etiquetaFechaHora(fechaIso: string) {
  const fecha = new Date(fechaIso);
  const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const hoy = new Date();
  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);

  if (esMismoDia(fecha, hoy)) return `Hoy ${hora}`;
  if (esMismoDia(fecha, manana)) return `Mañana ${hora}`;
  if (esMismoDia(fecha, ayer)) return `Ayer ${hora}`;
  return `${fecha.toLocaleDateString('es-ES')} ${hora}`;
}

export default function Inicio() {
  const { colors } = useTheme();
  const router = useRouter();
  const asegurarTomasDeHoy = useAsegurarTomasDeHoy();
  const { proximas, recargar: recargarProximas } = useProximaTomaPorMedicamento();
  const { medicamentos } = useMedicamentos();
  const { marcarTomado, marcarOmitido } = useMarcarToma();
  const [tomaEditando, setTomaEditando] = useState<ProximaToma | null>(null);

  const medicamentosConStockBajo = medicamentos.filter((m) => m.stockRestante <= UMBRAL_STOCK_BAJO);

  useFocusEffect(
    useCallback(() => {
      asegurarTomasDeHoy().then(recargarProximas);
    }, [asegurarTomasDeHoy, recargarProximas]),
  );

  const handleMarcar = async (toma: ProximaToma, tomado: boolean) => {
    if (tomado) await marcarTomado(toma.id);
    else await marcarOmitido(toma.id);
    // Al marcarla deja de ser 'pendiente', así que la próxima recarga ya
    // trae la siguiente toma pendiente de ESTE medicamento (si la hay).
    await recargarProximas();
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
        data={proximas}
        keyExtractor={(item) => String(item.medicamentoId)}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            No hay tomas pendientes. Añade un medicamento para empezar.
          </Text>
        }
        renderItem={({ item }) => (
          <Card>
            <View style={styles.cabecera}>
              <Text style={[typography.subtitle, { color: colors.text }]}>
                {etiquetaFechaHora(item.fechaHoraProgramada)}
              </Text>
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
            <View style={styles.acciones}>
              <Button label="Tomado" onPress={() => handleMarcar(item, true)} />
              <Button label="Omitir" variant="secondary" onPress={() => handleMarcar(item, false)} />
            </View>
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
        onCambiado={recargarProximas}
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
