import { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarClock, Check, ChevronRight, Clock, History, Pill, Settings, SunMedium, TriangleAlert, X } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { IconoCircular } from '@/components/IconoCircular';
import { PieAccion } from '@/components/PieAccion';
import { Pressable3D } from '@/components/Pressable3D';
import { useDb } from '@/db/client';
import { estadoCaducidad } from '@/features/medicamentos/formulario';
import { terminarTratamientosFinalizados } from '@/features/medicamentos/hooks/useActualizarMedicamento';
import { useMedicamentos } from '@/features/medicamentos/hooks/useMedicamentos';
import { sincronizarNotificaciones } from '@/features/notificaciones/scheduler';
import { EditarTomaModal } from '@/features/tomas/components/EditarTomaModal';
import { useAsegurarTomasDeHoy } from '@/features/tomas/hooks/useAsegurarTomasDeHoy';
import { useMarcarToma } from '@/features/tomas/hooks/useMarcarToma';
import { useTomasDeHoy, type TomaDeHoy } from '@/features/tomas/hooks/useTomasDeHoy';
import { claveDia } from '@/features/tomas/ocurrencias';
import { useTheme } from '@/theme/useTheme';
import { MIN_TOUCH_TARGET, spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';

const UMBRAL_STOCK_BAJO = 5;

function hora(fechaIso: string) {
  return new Date(fechaIso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function fechaDeHoy() {
  const texto = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function cuandoEs(fechaIso: string) {
  const fecha = new Date(fechaIso);
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  const dia =
    claveDia(fecha) === claveDia(manana)
      ? 'mañana'
      : fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' });
  return `${dia} a las ${hora(fechaIso)}`;
}

/** Agrupa por hora exacta: tres medicamentos a las 9:00 se leen como un solo momento del día. */
function agruparPorHora(items: TomaDeHoy[]) {
  const grupos = new Map<string, TomaDeHoy[]>();
  for (const item of items) {
    const clave = hora(item.fechaHoraProgramada);
    const grupo = grupos.get(clave);
    if (grupo) grupo.push(item);
    else grupos.set(clave, [item]);
  }
  return Array.from(grupos, ([title, data]) => ({ title, data }));
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
  const { tomasDeHoy, pendientesAnteriores, siguiente, recargar: recargarHoy } = useTomasDeHoy();
  const { medicamentos, recargar: recargarMedicamentos } = useMedicamentos();
  const { marcarTomado, marcarOmitido } = useMarcarToma();
  const [tomaEditando, setTomaEditando] = useState<TomaDeHoy | null>(null);

  useFocusEffect(
    useCallback(() => {
      // Primero se pasan a Terminados los tratamientos que acabaron ayer o
      // antes, para no generar ni avisar tomas de algo que ya terminó.
      terminarTratamientosFinalizados(db)
        .then(() => asegurarTomasDeHoy())
        .then(() => {
          recargarHoy();
          recargarMedicamentos();
          // Abrir la app renueva la ventana de avisos programados (ver scheduler.ts).
          void sincronizarNotificaciones(db);
        });
    }, [asegurarTomasDeHoy, recargarHoy, recargarMedicamentos, db]),
  );

  const secciones = useMemo(() => agruparPorHora(tomasDeHoy), [tomasDeHoy]);
  const resueltas = tomasDeHoy.filter((t) => t.estado !== 'pendiente').length;
  const proximaPendiente = tomasDeHoy.find((t) => t.estado === 'pendiente');
  const stockBajo = medicamentos.filter((m) => m.stockRestante <= UMBRAL_STOCK_BAJO);
  const caducados = medicamentos.filter((m) => {
    const estado = estadoCaducidad(m.fechaCaducidad);
    return estado === 'caducado' || estado === 'pronto';
  });

  const handleMarcar = async (toma: TomaDeHoy, tomado: boolean) => {
    if (tomado) await marcarTomado(toma.id);
    else await marcarOmitido(toma.id);
    await recargarHoy();
    // El stock baja al marcar como tomada.
    if (tomado) recargarMedicamentos();
  };

  const cabecera = (
    <View style={styles.cabeceraPantalla}>
      <View style={styles.tituloFila}>
        <View style={styles.tituloTextos}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{fechaDeHoy()}</Text>
          <Text style={[typography.largeTitle, { color: colors.text }]}>Hoy</Text>
        </View>
        <Pressable3D
          onPress={() => router.push('/historial')}
          escala={0.9}
          accessibilityRole="button"
          accessibilityLabel="Historial de tomas"
          style={[styles.botonCabecera, { backgroundColor: colors.fill }]}
        >
          <History color={colors.primary} size={20} />
        </Pressable3D>
        <Pressable3D
          onPress={() => router.push('/ajustes')}
          escala={0.9}
          accessibilityRole="button"
          accessibilityLabel="Ajustes"
          style={[styles.botonCabecera, { backgroundColor: colors.fill }]}
        >
          <Settings color={colors.primary} size={20} />
        </Pressable3D>
      </View>

      {tomasDeHoy.length > 0 && (
        <Card elevacion="raised" style={styles.bloqueCabecera}>
          <View style={styles.progresoFila}>
            <Text style={[typography.numeroGrande, { color: colors.text }]}>
              {resueltas}
              <Text style={[typography.subtitle, { color: colors.textTertiary }]}> / {tomasDeHoy.length}</Text>
            </Text>
            <Text style={[typography.bodySmall, styles.progresoTexto, { color: colors.textSecondary }]}>
              {proximaPendiente
                ? `Siguiente a las ${hora(proximaPendiente.fechaHoraProgramada)}`
                : 'Todo resuelto por hoy'}
            </Text>
          </View>
          <View
            style={[styles.barra, { backgroundColor: colors.fill }]}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: tomasDeHoy.length, now: resueltas }}
          >
            <View
              style={[
                styles.barraRelleno,
                {
                  backgroundColor: proximaPendiente ? colors.primary : colors.success,
                  width: `${(resueltas / tomasDeHoy.length) * 100}%`,
                },
              ]}
            />
          </View>
        </Card>
      )}

      {pendientesAnteriores > 0 && (
        <Pressable3D onPress={() => router.push('/historial')} escala={0.985} style={styles.bloqueCabecera}>
          <Card elevacion="none" sinPadding>
            <View style={[styles.aviso, { backgroundColor: colors.fill }]}>
              <History color={colors.textSecondary} size={20} />
              <Text style={[typography.bodySmall, styles.avisoTextos, { color: colors.text }]}>
                {pendientesAnteriores === 1
                  ? '1 toma de días anteriores sin marcar'
                  : `${pendientesAnteriores} tomas de días anteriores sin marcar`}
              </Text>
              <ChevronRight color={colors.textTertiary} size={18} />
            </View>
          </Card>
        </Pressable3D>
      )}

      {stockBajo.length > 0 && (
        <Card elevacion="none" sinPadding style={styles.bloqueCabecera}>
          <View style={[styles.aviso, { backgroundColor: colors.warningSoft }]}>
            <TriangleAlert color={colors.warning} size={20} />
            <View style={styles.avisoTextos}>
              <Text style={[typography.bodyStrong, { color: colors.warning }]}>Quedan pocas unidades</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {stockBajo.map((m) => `${m.nombre} (${m.stockRestante})`).join(' · ')}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {caducados.length > 0 && (
        <Card elevacion="none" sinPadding style={styles.bloqueCabecera}>
          <View style={[styles.aviso, { backgroundColor: colors.warningSoft }]}>
            <CalendarClock color={colors.warning} size={20} />
            <View style={styles.avisoTextos}>
              <Text style={[typography.bodyStrong, { color: colors.warning }]}>Revisa la caducidad</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {caducados
                  .map((m) => `${m.nombre} (${estadoCaducidad(m.fechaCaducidad) === 'caducado' ? 'caducado' : 'caduca pronto'})`)
                  .join(' · ')}
              </Text>
            </View>
          </View>
        </Card>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SectionList
        sections={secciones}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.lista, { paddingTop: insets.top + spacing.sm }]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={cabecera}
        ListEmptyComponent={
          <EmptyState
            icono={<SunMedium color={colors.primary} size={30} />}
            titulo="Hoy no tienes tomas"
            descripcion={
              siguiente
                ? `La siguiente es ${cuandoEs(siguiente.fechaHoraProgramada)}: ${siguiente.nombreMedicamento}.`
                : 'Cuando añadas un medicamento con su pauta, aquí verás las tomas de cada día.'
            }
          />
        }
        ListFooterComponent={
          tomasDeHoy.length > 0 && !proximaPendiente && siguiente ? (
            <Text style={[typography.caption, styles.pieLista, { color: colors.textTertiary }]}>
              La siguiente es {cuandoEs(siguiente.fechaHoraProgramada)}.
            </Text>
          ) : null
        }
        renderSectionHeader={({ section }) => {
          const atrasada = section.data.some(
            (t) => t.estado === 'pendiente' && new Date(t.fechaHoraProgramada).getTime() < Date.now(),
          );
          return (
            <View style={styles.cabeceraSeccion}>
              <Text style={[typography.subtitle, styles.horaSeccion, { color: colors.text }]}>{section.title}</Text>
              {atrasada && (
                <View style={[styles.badge, { backgroundColor: colors.errorSoft }]}>
                  <Text style={[typography.caption, { color: colors.error, fontWeight: '600' }]}>Atrasada</Text>
                </View>
              )}
            </View>
          );
        }}
        renderItem={({ item, index, section }) => (
          <FilaToma
            toma={item}
            primera={index === 0}
            ultima={index === section.data.length - 1}
            onEditar={() => setTomaEditando(item)}
            onTomado={() => handleMarcar(item, true)}
            onOmitir={() => handleMarcar(item, false)}
          />
        )}
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
        onCambiado={() => {
          recargarHoy();
          recargarMedicamentos();
        }}
      />
    </View>
  );
}

type PropsFila = {
  toma: TomaDeHoy;
  primera: boolean;
  ultima: boolean;
  onEditar: () => void;
  onTomado: () => void;
  onOmitir: () => void;
};

/**
 * Una toma de la agenda. Las filas de una misma hora se pintan como una
 * sola tarjeta agrupada (esquinas redondeadas solo arriba de la primera y
 * abajo de la última). El estado se lee con icono + texto + color, nunca
 * solo por color (requisito de accesibilidad del plan de diseño).
 */
function FilaToma({ toma, primera, ultima, onEditar, onTomado, onOmitir }: PropsFila) {
  const { colors } = useTheme();
  const pendiente = toma.estado === 'pendiente';
  const tomada = toma.estado === 'tomado';

  let icono: React.ReactNode;
  let fondoIcono: string;
  let estadoTexto: string;
  if (tomada) {
    icono = <Check color={colors.success} size={20} strokeWidth={2.5} />;
    fondoIcono = colors.successSoft;
    estadoTexto = 'Tomada';
  } else if (toma.estado === 'omitido') {
    icono = <X color={colors.error} size={20} strokeWidth={2.5} />;
    fondoIcono = colors.errorSoft;
    estadoTexto = toma.motivoOmision ? `Omitida · ${toma.motivoOmision}` : 'Omitida';
  } else if (toma.estado === 'pospuesto') {
    icono = <Clock color={colors.warning} size={20} />;
    fondoIcono = colors.warningSoft;
    estadoTexto = 'Pospuesta';
  } else {
    icono = <Pill color={colors.primary} size={20} />;
    fondoIcono = colors.primarySoft;
    estadoTexto = toma.dosis;
  }

  return (
    <View
      style={[
        styles.fila,
        { backgroundColor: colors.surface },
        primera && styles.filaPrimera,
        ultima && styles.filaUltima,
        !primera && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
      ]}
    >
      <Pressable
        onPress={onEditar}
        accessibilityRole="button"
        accessibilityLabel={`${toma.nombreMedicamento}, ${estadoTexto}. Editar toma`}
        style={({ pressed }) => [styles.filaPrincipal, pressed && { opacity: 0.6 }]}
      >
        <IconoCircular fondo={fondoIcono} tamano={40}>
          {icono}
        </IconoCircular>
        <View style={styles.filaTextos}>
          <Text
            style={[
              typography.body,
              { color: pendiente ? colors.text : colors.textSecondary },
              toma.estado === 'omitido' && styles.tachado,
            ]}
            numberOfLines={1}
          >
            {toma.nombreMedicamento}
          </Text>
          <Text
            style={[
              typography.caption,
              { color: tomada ? colors.success : toma.estado === 'omitido' ? colors.error : colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {pendiente ? estadoTexto : `${estadoTexto} · ${toma.dosis}`}
          </Text>
        </View>
      </Pressable>

      {pendiente && (
        <View style={styles.accionesFila}>
          <Pressable3D
            onPress={onOmitir}
            escala={0.9}
            accessibilityRole="button"
            accessibilityLabel={`Omitir ${toma.nombreMedicamento}`}
            style={[styles.botonRedondo, { backgroundColor: colors.fill }]}
          >
            <X color={colors.textSecondary} size={20} />
          </Pressable3D>
          <Pressable3D
            onPress={onTomado}
            escala={0.9}
            accessibilityRole="button"
            accessibilityLabel={`Marcar ${toma.nombreMedicamento} como tomado`}
            style={[styles.botonRedondo, { backgroundColor: colors.primary }]}
          >
            <Check color={colors.onPrimary} size={22} strokeWidth={2.5} />
          </Pressable3D>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  cabeceraPantalla: { gap: spacing.xs, paddingBottom: spacing.xs },
  tituloFila: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  tituloTextos: { flex: 1 },
  botonCabecera: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  bloqueCabecera: { marginTop: spacing.sm },
  progresoFila: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  progresoTexto: { flex: 1, textAlign: 'right' },
  barra: { height: 6, borderRadius: radii.pill, overflow: 'hidden', marginTop: spacing.sm },
  barraRelleno: { height: '100%', borderRadius: radii.pill },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  avisoTextos: { flex: 1, gap: 2 },
  cabeceraSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  horaSeccion: { fontVariant: ['tabular-nums'] },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.sm,
  },
  filaPrimera: { borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
  filaUltima: { borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg },
  filaPrincipal: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  filaTextos: { flex: 1, gap: 2 },
  tachado: { textDecorationLine: 'line-through' },
  accionesFila: { flexDirection: 'row', gap: spacing.sm, paddingLeft: spacing.sm },
  botonRedondo: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieLista: { textAlign: 'center', marginTop: spacing.lg },
});
