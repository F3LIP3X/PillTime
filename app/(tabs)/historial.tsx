import { useCallback, useMemo, useState } from 'react';
import { Alert, SectionList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Check, FileDown, History, Pencil, SkipForward } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { IconoCircular } from '@/components/IconoCircular';
import { Pressable3D } from '@/components/Pressable3D';
import { useDb } from '@/db/client';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
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

/** Agrupa por día para que el historial se lea como un diario, no como una lista plana. */
function agruparPorDia(items: ItemHistorial[]) {
  const grupos = new Map<string, ItemHistorial[]>();
  for (const item of items) {
    const clave = new Date(item.fechaHoraProgramada).toDateString();
    const existente = grupos.get(clave);
    if (existente) existente.push(item);
    else grupos.set(clave, [item]);
  }
  return Array.from(grupos.entries()).map(([clave, data]) => ({ title: clave, data }));
}

function tituloDia(dateString: string) {
  const fecha = new Date(dateString);
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);

  if (fecha.toDateString() === hoy.toDateString()) return 'Hoy';
  if (fecha.toDateString() === ayer.toDateString()) return 'Ayer';
  return fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function Historial() {
  const { colors } = useTheme();
  const db = useDb();
  const { historial, recargar } = useHistorial();
  const [exportando, setExportando] = useState(false);
  const [tomaEditando, setTomaEditando] = useState<ItemHistorial | null>(null);

  useFocusEffect(
    useCallback(() => {
      recargar();
    }, [recargar]),
  );

  const secciones = useMemo(() => agruparPorDia(historial), [historial]);

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

  /** Color + icono por estado: nunca solo color (requisito de accesibilidad del plan de diseño). */
  const aspectoEstado = (estado: string) => {
    if (estado === 'tomado') {
      return { fondo: colors.successSoft, color: colors.success, icono: <Check color={colors.success} size={18} /> };
    }
    if (estado === 'omitido') {
      return {
        fondo: colors.errorSoft,
        color: colors.error,
        icono: <SkipForward color={colors.error} size={18} />,
      };
    }
    return { fondo: colors.fill, color: colors.textSecondary, icono: <History color={colors.textSecondary} size={18} /> };
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SectionList
        sections={secciones}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <EmptyState
            icono={<History color={colors.primary} size={30} />}
            titulo="Aún no hay historial"
            descripcion="Cada toma que marques como tomada u omitida quedará registrada aquí."
          />
        }
        renderSectionHeader={({ section }) => (
          <Text style={[typography.overline, styles.cabeceraSeccion, { color: colors.textTertiary }]}>
            {tituloDia(section.title)}
          </Text>
        )}
        renderItem={({ item, index, section }) => {
          const aspecto = aspectoEstado(item.estado);
          const ultima = index === section.data.length - 1;

          return (
            <Card sinPadding style={[styles.tarjetaFila, ultima ? null : styles.tarjetaFilaPegada]}>
              <Pressable3D onPress={() => setTomaEditando(item)} escala={0.985}>
                <View style={styles.fila}>
                  <IconoCircular fondo={aspecto.fondo} tamano={38}>
                    {aspecto.icono}
                  </IconoCircular>

                  <View style={styles.textos}>
                    <Text style={[typography.body, { color: colors.text }]} numberOfLines={1}>
                      {item.nombreMedicamento}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                      {new Date(item.fechaHoraProgramada).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {item.motivoOmision ? ` · ${item.motivoOmision}` : ''}
                    </Text>
                  </View>

                  <View style={[styles.badge, { backgroundColor: aspecto.fondo }]}>
                    <Text style={[typography.caption, { color: aspecto.color, fontWeight: '600' }]}>
                      {ETIQUETA_ESTADO[item.estado]}
                    </Text>
                  </View>

                  <Pencil color={colors.textTertiary} size={16} />
                </View>
              </Pressable3D>
            </Card>
          );
        }}
      />

      <View style={[styles.pieAccion, { backgroundColor: colors.background, borderTopColor: colors.separator }]}>
        <Button
          label={exportando ? 'Generando PDF…' : 'Exportar a PDF'}
          variant="secondary"
          icono={<FileDown color={colors.primary} size={18} />}
          disabled={exportando || historial.length === 0}
          onPress={handleExportar}
        />
      </View>

      <EditarTomaModal toma={tomaEditando} onClose={() => setTomaEditando(null)} onCambiado={recargar} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contenido: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  cabeceraSeccion: { marginTop: spacing.md, marginBottom: spacing.sm, marginLeft: spacing.xs },
  tarjetaFila: { marginBottom: spacing.sm },
  tarjetaFilaPegada: { marginBottom: spacing.sm },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  textos: { flex: 1, gap: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.pill },
  pieAccion: { padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
