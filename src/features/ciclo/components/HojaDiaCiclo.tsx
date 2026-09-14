import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Droplet, Trash2 } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { Chips } from '@/components/Chips';
import { HojaModal } from '@/components/HojaModal';
import { TextField } from '@/components/TextField';
import { ANIMO_CICLO, DOLOR, ENERGIA, FLUJO, SINTOMAS_CICLO } from '@/db/schema';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { diasEntre, fechaLegible } from '../fechas';
import type { DatosRegistroCiclo, RegistroCiclo } from '../hooks/useCiclo';
import { ETIQUETA_FASE, finDeRegla, type Fase, type Periodo } from '../prediccion';

const ETIQUETAS: Record<string, string> = {
  manchado: 'Manchado', ligero: 'Ligero', medio: 'Medio', abundante: 'Abundante',
  'sin-dolor': 'Sin dolor', leve: 'Leve', moderado: 'Moderado', fuerte: 'Fuerte',
  bien: 'Bien', sensible: 'Sensible', irritable: 'Irritable', triste: 'Triste', ansiosa: 'Ansiosa',
  baja: 'Baja', normal: 'Normal', alta: 'Alta',
  colicos: 'Cólicos', 'dolor-cabeza': 'Dolor de cabeza', hinchazon: 'Hinchazón', 'sensibilidad-pecho': 'Pecho sensible',
  'dolor-espalda': 'Dolor de espalda', acne: 'Acné', nauseas: 'Náuseas', antojos: 'Antojos', insomnio: 'Insomnio',
};

const opciones = <T extends string>(valores: readonly T[]) => valores.map((valor) => ({ valor, etiqueta: ETIQUETAS[valor] }));
const uno = <T extends string>(v: T | null) => (v ? [v] : []);

type Props = {
  dia: string | null;
  hoy: string;
  fase: Fase | undefined;
  periodos: Periodo[];
  mediaRegla: number;
  registro: RegistroCiclo | undefined;
  onClose: () => void;
  onGuardar: (dia: string, datos: DatosRegistroCiclo) => Promise<void>;
  onInicio: (dia: string) => Promise<string | null>;
  onFin: (periodo: Periodo, dia: string) => Promise<string | null>;
  onEliminarPeriodo: (id: number) => Promise<void>;
};

/** Todo lo de un día del calendario: marcar inicio/fin de regla y apuntar síntomas. */
export function HojaDiaCiclo({ dia, hoy, fase, periodos, mediaRegla, registro, onClose, onGuardar, onInicio, onFin, onEliminarPeriodo }: Props) {
  const { colors } = useTheme();
  const [datos, setDatos] = useState<DatosRegistroCiclo>({ flujo: null, dolor: null, animo: null, energia: null, sintomas: null, notas: null });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!dia) return;
    setDatos({
      flujo: registro?.flujo ?? null,
      dolor: registro?.dolor ?? null,
      animo: registro?.animo ?? null,
      energia: registro?.energia ?? null,
      sintomas: registro?.sintomas ?? null,
      notas: registro?.notas ?? null,
    });
  }, [dia, registro]);

  if (!dia) return null;

  const futuro = dia > hoy;
  const periodoDelDia = periodos.find((p) => dia >= p.fechaInicio && dia <= finDeRegla(p, hoy, mediaRegla));
  // Una regla abierta de hace más de 10 días se da por olvidada: ahí se
  // ofrece registrar una nueva (planInicio la cierra sola), no terminarla.
  const abierta = periodos.find((p) => p.fechaFin === null && p.fechaInicio <= dia && diasEntre(p.fechaInicio, dia) <= 10);
  const cambiar = (parcial: Partial<DatosRegistroCiclo>) => setDatos((d) => ({ ...d, ...parcial }));

  const mostrarError = (error: string | null) => {
    if (error) Alert.alert('No se pudo guardar', error);
    else onClose();
  };

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      await onGuardar(dia, { ...datos, notas: datos.notas?.trim() || null });
      onClose();
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarPeriodo = (periodo: Periodo) => {
    Alert.alert('Borrar esta regla', `Se borrará la regla que empezó el ${fechaLegible(periodo.fechaInicio, { day: 'numeric', month: 'long' })}. Las predicciones se recalcularán.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await onEliminarPeriodo(periodo.id);
          onClose();
        },
      },
    ]);
  };

  return (
    <HojaModal visible titulo={fechaLegible(dia, { weekday: 'long', day: 'numeric', month: 'long' })} onClose={onClose}>
      {!!fase && <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>{ETIQUETA_FASE[fase]}</Text>}

      {futuro ? (
        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
          Es un día futuro: lo que ves es una estimación. Podrás apuntar cosas cuando llegue.
        </Text>
      ) : (
        <>
          <View style={styles.acciones}>
            {periodoDelDia ? (
              <>
                {periodoDelDia.fechaFin === null && (
                  <Button label="La regla terminó este día" variant="secondary" onPress={async () => mostrarError(await onFin(periodoDelDia, dia))} />
                )}
                {periodoDelDia.fechaFin !== null && dia !== periodoDelDia.fechaFin && (
                  <Button label="Mover el fin a este día" variant="secondary" onPress={async () => mostrarError(await onFin(periodoDelDia, dia))} />
                )}
                <Button
                  label="Borrar esta regla"
                  variant="danger"
                  icono={<Trash2 color={colors.error} size={18} />}
                  onPress={() => handleEliminarPeriodo(periodoDelDia)}
                />
              </>
            ) : abierta ? (
              <Button label="La regla terminó este día" variant="secondary" onPress={async () => mostrarError(await onFin(abierta, dia))} />
            ) : (
              <Button
                label="Me vino la regla este día"
                icono={<Droplet color={colors.onPrimary} size={18} />}
                onPress={async () => mostrarError(await onInicio(dia))}
              />
            )}
          </View>

          <View style={styles.bloque}>
            <Text style={[typography.overline, { color: colors.textTertiary }]}>Flujo</Text>
            <Chips etiquetaAccesible="Flujo" opciones={opciones(FLUJO)} seleccion={uno(datos.flujo)} onChange={([v]) => cambiar({ flujo: v ?? null })} />
          </View>
          <View style={styles.bloque}>
            <Text style={[typography.overline, { color: colors.textTertiary }]}>Dolor</Text>
            <Chips etiquetaAccesible="Dolor" opciones={opciones(DOLOR)} seleccion={uno(datos.dolor)} onChange={([v]) => cambiar({ dolor: v ?? null })} />
          </View>
          <View style={styles.bloque}>
            <Text style={[typography.overline, { color: colors.textTertiary }]}>Ánimo</Text>
            <Chips etiquetaAccesible="Ánimo" opciones={opciones(ANIMO_CICLO)} seleccion={uno(datos.animo)} onChange={([v]) => cambiar({ animo: v ?? null })} />
          </View>
          <View style={styles.bloque}>
            <Text style={[typography.overline, { color: colors.textTertiary }]}>Energía</Text>
            <Chips etiquetaAccesible="Energía" opciones={opciones(ENERGIA)} seleccion={uno(datos.energia)} onChange={([v]) => cambiar({ energia: v ?? null })} />
          </View>
          <View style={styles.bloque}>
            <Text style={[typography.overline, { color: colors.textTertiary }]}>Síntomas</Text>
            <Chips
              multiple
              etiquetaAccesible="Síntomas"
              opciones={opciones(SINTOMAS_CICLO)}
              seleccion={(datos.sintomas ?? '').split(',').filter(Boolean) as (typeof SINTOMAS_CICLO)[number][]}
              onChange={(v) => cambiar({ sintomas: v.length ? v.join(',') : null })}
            />
          </View>
          <TextField
            label="Notas"
            value={datos.notas ?? ''}
            onChangeText={(notas) => cambiar({ notas })}
            multiline
            placeholder="Cómo te has encontrado hoy"
            style={styles.notas}
          />
          <Button label={guardando ? 'Guardando…' : 'Guardar día'} onPress={handleGuardar} disabled={guardando} />
        </>
      )}
    </HojaModal>
  );
}

const styles = StyleSheet.create({
  acciones: { gap: spacing.sm },
  bloque: { gap: spacing.sm },
  notas: { minHeight: 80, textAlignVertical: 'top' },
});
