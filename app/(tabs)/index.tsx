import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, PartyPopper, Pencil, Pill, TriangleAlert, X } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { PieAccion } from '@/components/PieAccion';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { IconoCircular } from '@/components/IconoCircular';
import { Pressable3D } from '@/components/Pressable3D';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';
import { useProximaTomaPorMedicamento, type ProximaToma } from '@/features/tomas/hooks/useProximaTomaPorMedicamento';
import { useAsegurarTomasDeHoy } from '@/features/tomas/hooks/useAsegurarTomasDeHoy';
import { useMarcarToma } from '@/features/tomas/hooks/useMarcarToma';
import { useMedicamentos } from '@/features/medicamentos/hooks/useMedicamentos';
import { terminarTratamientosFinalizados } from '@/features/medicamentos/hooks/useActualizarMedicamento';
import { EditarTomaModal } from '@/features/tomas/components/EditarTomaModal';
import { sincronizarNotificaciones } from '@/features/notificaciones/scheduler';
import { useDb } from '@/db/client';

const UMBRAL_STOCK_BAJO = 5;

function esMismoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function hora(fechaIso: string) {
  return new Date(fechaIso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

/** "Hoy", "Mañana", "Ayer" o la fecha corta; se muestra junto a la hora. */
function etiquetaDia(fechaIso: string) {
  const fecha = new Date(fechaIso);
  const hoy = new Date();
  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);

  if (esMismoDia(fecha, hoy)) return 'Hoy';
  if (esMismoDia(fecha, manana)) return 'Mañana';
  if (esMismoDia(fecha, ayer)) return 'Ayer';
  return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

/** Una toma cuya hora ya pasó se marca como atrasada, no como pendiente normal. */
function estaAtrasada(fechaIso: string) {
  return new Date(fechaIso).getTime() < Date.now();
}

function saludo() {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function Inicio() {
  const { colors } = useTheme();
  const router = useRouter();
  // Esta pantalla oculta la cabecera para lucir el título grande, así
  // que el hueco de la barra de estado hay que reservarlo a mano: si no,
  // el reloj y la batería del sistema caen encima del texto.
  const insets = useSafeAreaInsets();
  const db = useDb();
  const asegurarTomasDeHoy = useAsegurarTomasDeHoy();
  const { proximas, recargar: recargarProximas } = useProximaTomaPorMedicamento();
  const { medicamentos, recargar: recargarMedicamentos } = useMedicamentos();
  const { marcarTomado, marcarOmitido } = useMarcarToma();
  const [tomaEditando, setTomaEditando] = useState<ProximaToma | null>(null);

  const medicamentosConStockBajo = medicamentos.filter((m) => m.stockRestante <= UMBRAL_STOCK_BAJO);

  useFocusEffect(
    useCallback(() => {
      // Primero se pasan a Terminados los tratamientos que acabaron ayer o
      // antes, para no generar ni avisar tomas de algo que ya terminó.
      terminarTratamientosFinalizados(db)
        .then(() => asegurarTomasDeHoy())
        .then(() => {
          recargarProximas();
          recargarMedicamentos();
          // Abrir la app renueva la ventana de avisos programados (ver scheduler.ts).
          void sincronizarNotificaciones(db);
        });
    }, [asegurarTomasDeHoy, recargarProximas, recargarMedicamentos, db]),
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
      <FlatList
        data={proximas}
        keyExtractor={(item) => String(item.medicamentoId)}
        contentContainerStyle={[styles.lista, { paddingTop: insets.top + spacing.sm }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.cabeceraPantalla}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{saludo()}</Text>
            <Text style={[typography.largeTitle, { color: colors.text }]}>
              {proximas.length > 0 ? 'Próximas tomas' : 'Todo al día'}
            </Text>

            {medicamentosConStockBajo.length > 0 && (
              <Card style={styles.avisoStock} elevacion="none">
                <View style={[styles.avisoInterior, { backgroundColor: colors.warningSoft }]}>
                  <TriangleAlert color={colors.warning} size={20} />
                  <View style={styles.avisoTextos}>
                    <Text style={[typography.bodyStrong, { color: colors.warning }]}>Quedan pocas unidades</Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {medicamentosConStockBajo.map((m) => `${m.nombre} (${m.stockRestante})`).join(' · ')}
                    </Text>
                  </View>
                </View>
              </Card>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icono={<PartyPopper color={colors.primary} size={30} />}
            titulo="No hay tomas pendientes"
            descripcion="Cuando añadas un medicamento, aquí verás su próxima toma."
          />
        }
        renderItem={({ item, index }) => {
          const atrasada = estaAtrasada(item.fechaHoraProgramada);
          const dia = etiquetaDia(item.fechaHoraProgramada);

          return (
            <Card elevacion={index === 0 ? 'raised' : 'card'} sinPadding>
              <View style={styles.tarjetaInterior}>
                <View style={styles.filaSuperior}>
                  <IconoCircular fondo={atrasada ? colors.errorSoft : colors.primarySoft}>
                    <Pill color={atrasada ? colors.error : colors.primary} size={22} />
                  </IconoCircular>

                  <View style={styles.horaBloque}>
                    <Text style={[typography.numeroGrande, { color: colors.text }]}>
                      {hora(item.fechaHoraProgramada)}
                    </Text>
                    <View style={styles.etiquetasFila}>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>{dia}</Text>
                      {atrasada && (
                        <View style={[styles.badge, { backgroundColor: colors.errorSoft }]}>
                          <Text style={[typography.caption, { color: colors.error, fontWeight: '600' }]}>
                            Atrasada
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Pressable3D
                    onPress={() => setTomaEditando(item)}
                    escala={0.9}
                    accessibilityRole="button"
                    accessibilityLabel="Editar toma"
                    style={styles.botonEditar}
                  >
                    <Pencil color={colors.textTertiary} size={18} />
                  </Pressable3D>
                </View>

                <View style={styles.nombreBloque}>
                  <Text style={[typography.subtitle, { color: colors.text }]} numberOfLines={2}>
                    {item.nombreMedicamento}
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>{item.dosis}</Text>
                </View>

                <View style={styles.acciones}>
                  <View style={styles.accionFlexible}>
                    <Button
                      label="Tomado"
                      icono={<Check color="#FFFFFF" size={18} />}
                      onPress={() => handleMarcar(item, true)}
                    />
                  </View>
                  <View style={styles.accionFlexible}>
                    <Button
                      label="Omitir"
                      variant="secondary"
                      icono={<X color={colors.primary} size={18} />}
                      onPress={() => handleMarcar(item, false)}
                    />
                  </View>
                </View>
              </View>
            </Card>
          );
        }}
      />

      <PieAccion dentroDeTabs>
        <Button
          label="Añadir medicamento"
          variant="secondary"
          onPress={() => router.push('/medicamento/nuevo')}
          accessibilityLabel="Añadir medicamento"
        />
      </PieAccion>

      <EditarTomaModal
        toma={tomaEditando}
        onClose={() => setTomaEditando(null)}
        onCambiado={recargarProximas}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
  },
  cabeceraPantalla: { gap: spacing.xs, paddingBottom: spacing.xs },
  avisoStock: { marginTop: spacing.md },
  avisoInterior: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  avisoTextos: { flex: 1, gap: 2 },
  tarjetaInterior: { padding: spacing.md, gap: spacing.md },
  filaSuperior: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  horaBloque: { flex: 1, gap: 2 },
  etiquetasFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill },
  botonEditar: { padding: spacing.xs },
  nombreBloque: { gap: 2 },
  acciones: { flexDirection: 'row', gap: spacing.sm },
  accionFlexible: { flex: 1 },
});
