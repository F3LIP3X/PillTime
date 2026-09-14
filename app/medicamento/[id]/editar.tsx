import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarDays, Clock, Plus, Trash2 } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { HojaModal } from '@/components/HojaModal';
import { ListRow } from '@/components/ListRow';
import { PieAccion } from '@/components/PieAccion';
import { CamposMedicamento } from '@/features/medicamentos/components/CamposMedicamento';
import { EditorPauta } from '@/features/medicamentos/components/EditorPauta';
import { mensajeErrorGuardado } from '@/features/medicamentos/errores';
import {
  aDatosMedicamento,
  formularioDesdeMedicamento,
  formularioVacio,
  validarFormulario,
} from '@/features/medicamentos/formulario';
import { useActualizarMedicamento, useEliminarMedicamento } from '@/features/medicamentos/hooks/useActualizarMedicamento';
import { useMedicamento } from '@/features/medicamentos/hooks/useMedicamento';
import { useActualizarPauta, useCrearPauta, useQuitarPauta } from '@/features/medicamentos/hooks/usePautas';
import { describirPauta } from '@/features/medicamentos/describirPauta';
import { pautaDesdeHorario, pautaNueva, validarPauta, type EstadoPauta } from '@/features/medicamentos/pauta';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import type { horariosMedicamento } from '@/db/schema';

type Horario = typeof horariosMedicamento.$inferSelect;

/** null = cerrada; horario null = añadiendo una pauta nueva. */
type EdicionPauta = { horario: Horario | null; pauta: EstadoPauta } | null;

export default function EditarMedicamento() {
  const { id, nuevaPauta } = useLocalSearchParams<{ id: string; nuevaPauta?: string }>();
  const medicamentoId = Number(id);
  const router = useRouter();
  const { colors } = useTheme();
  const { medicamento, horarios, recargar } = useMedicamento(medicamentoId);
  const actualizar = useActualizarMedicamento();
  const eliminarMedicamento = useEliminarMedicamento();
  const crearPauta = useCrearPauta();
  const actualizarPauta = useActualizarPauta();
  const quitarPauta = useQuitarPauta();

  const [formulario, setFormulario] = useState(formularioVacio);
  const [cargado, setCargado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [edicionPauta, setEdicionPauta] = useState<EdicionPauta>(null);

  useFocusEffect(
    useCallback(() => {
      recargar();
    }, [recargar]),
  );

  // Rellena el formulario solo la primera vez: recargar tras editar una
  // pauta no debe pisar lo que el usuario está escribiendo arriba.
  useEffect(() => {
    if (!medicamento || cargado) return;
    setFormulario(formularioDesdeMedicamento(medicamento));
    setCargado(true);
    // Viene de "Reactivar": se abre directamente el alta de pauta.
    if (nuevaPauta) setEdicionPauta({ horario: null, pauta: pautaNueva() });
  }, [medicamento, cargado, nuevaPauta]);

  const error = validarFormulario(formulario);

  const handleGuardar = async () => {
    if (error) return;
    setGuardando(true);
    try {
      await actualizar(medicamentoId, aDatosMedicamento(formulario));
      router.back();
    } catch (e) {
      Alert.alert('No se pudo guardar', mensajeErrorGuardado(e));
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarPauta = async () => {
    if (!edicionPauta || validarPauta(edicionPauta.pauta)) return;
    if (edicionPauta.horario) {
      await actualizarPauta(edicionPauta.horario.id, medicamentoId, edicionPauta.pauta);
    } else {
      await crearPauta(medicamentoId, edicionPauta.pauta);
    }
    setEdicionPauta(null);
    await recargar();
  };

  const handleQuitarPauta = (horario: Horario) => {
    Alert.alert(
      'Quitar pauta',
      'Dejarán de crearse tomas y avisos de esta pauta. Las tomas pasadas se quedan en el historial.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            await quitarPauta(horario.id);
            setEdicionPauta(null);
            await recargar();
          },
        },
      ],
    );
  };

  const handleEliminar = () => {
    Alert.alert(
      'Eliminar medicamento',
      `Se borrará ${medicamento?.nombre ?? 'el medicamento'} con todas sus pautas y su historial de tomas. No se puede deshacer.\n\nSi solo lo has dejado de tomar, mejor termina el tratamiento: así conservas el historial.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await eliminarMedicamento(medicamentoId);
            // Fuera del detalle también: ese medicamento ya no existe.
            router.dismissTo('/medicamentos');
          },
        },
      ],
    );
  };

  if (!medicamento || !cargado) return null;

  return (
    <View style={[styles.pantalla, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <CamposMedicamento valor={formulario} onChange={setFormulario} />

        <View style={styles.grupo}>
          <Text style={[typography.overline, styles.tituloGrupo, { color: colors.textTertiary }]}>Pauta</Text>
          <Card sinPadding>
            {horarios.map((horario) => {
              const { titulo, detalle } = describirPauta(horario);
              return (
                <ListRow
                  key={horario.id}
                  titulo={titulo}
                  subtitulo={detalle}
                  izquierda={
                    horario.tipo === 'semanal' ? (
                      <Clock color={colors.primary} size={20} />
                    ) : (
                      <CalendarDays color={colors.primary} size={20} />
                    )
                  }
                  onPress={() => setEdicionPauta({ horario, pauta: pautaDesdeHorario(horario) })}
                />
              );
            })}
            <ListRow
              titulo="Añadir pauta"
              izquierda={<Plus color={colors.primary} size={20} />}
              onPress={() => setEdicionPauta({ horario: null, pauta: pautaNueva() })}
              sinChevron
              conSeparador={false}
            />
          </Card>
          {horarios.length === 0 && (
            <Text style={[typography.caption, styles.pieGrupo, { color: colors.textSecondary }]}>
              Sin pauta no se crean tomas ni avisos de este medicamento.
            </Text>
          )}
        </View>

        <Button
          label="Eliminar medicamento"
          variant="danger"
          icono={<Trash2 color={colors.error} size={18} />}
          onPress={handleEliminar}
        />
      </ScrollView>

      <PieAccion>
        <Button label={guardando ? 'Guardando…' : 'Guardar cambios'} onPress={handleGuardar} disabled={!!error || guardando} />
      </PieAccion>

      <HojaModal
        visible={edicionPauta !== null}
        titulo={edicionPauta?.horario ? 'Cambiar pauta' : 'Nueva pauta'}
        onClose={() => setEdicionPauta(null)}
      >
        {edicionPauta && (
          <>
            <EditorPauta
              valor={edicionPauta.pauta}
              onChange={(pauta) => setEdicionPauta({ ...edicionPauta, pauta })}
              permitirCambiarModo={!edicionPauta.horario}
            />
            {edicionPauta.horario && (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                El cambio vale desde ahora: las tomas ya pasadas no se modifican.
              </Text>
            )}
            <Button label="Guardar pauta" onPress={handleGuardarPauta} disabled={!!validarPauta(edicionPauta.pauta)} />
            {edicionPauta.horario && (
              <Button
                label="Quitar pauta"
                variant="danger"
                icono={<Trash2 color={colors.error} size={18} />}
                onPress={() => handleQuitarPauta(edicionPauta.horario!)}
              />
            )}
          </>
        )}
      </HojaModal>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  container: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
  grupo: { gap: spacing.sm },
  tituloGrupo: { marginLeft: spacing.xs },
  pieGrupo: { marginLeft: spacing.xs },
});
