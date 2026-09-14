import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DateTimeField } from '@/components/DateTimeField';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme/useTheme';
import { MIN_TOUCH_TARGET, spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';
import { soloEntero } from '../formulario';
import { fechasTratamiento, validarPauta, type EstadoPauta } from '../pauta';

const DIAS_SEMANA = [
  { iso: 1, etiqueta: 'L', nombre: 'lunes' },
  { iso: 2, etiqueta: 'M', nombre: 'martes' },
  { iso: 3, etiqueta: 'X', nombre: 'miércoles' },
  { iso: 4, etiqueta: 'J', nombre: 'jueves' },
  { iso: 5, etiqueta: 'V', nombre: 'viernes' },
  { iso: 6, etiqueta: 'S', nombre: 'sábado' },
  { iso: 7, etiqueta: 'D', nombre: 'domingo' },
];

type Props = {
  valor: EstadoPauta;
  onChange: (pauta: EstadoPauta) => void;
  /** En la edición el tipo no se cambia (se quita la pauta y se añade otra). */
  permitirCambiarModo?: boolean;
};

/** Formulario de una pauta, compartido por el alta de medicamento y la edición de pautas. */
export function EditorPauta({ valor, onChange, permitirCambiarModo = true }: Props) {
  const { colors } = useTheme();
  const cambiar = (parcial: Partial<EstadoPauta>) => onChange({ ...valor, ...parcial });
  const error = validarPauta(valor);

  const alternarDia = (iso: number) =>
    cambiar({ dias: valor.dias.includes(iso) ? valor.dias.filter((d) => d !== iso) : [...valor.dias, iso] });

  const fechas =
    valor.modo === 'intervalo'
      ? fechasTratamiento(valor.inicio, Number(valor.frecuenciaHoras), Number(valor.duracionDias))
      : [];

  let resumen: string;
  if (error) resumen = error;
  else if (valor.modo === 'semanal') {
    resumen =
      valor.duracion === 'indefinido'
        ? 'Se repite hasta que termines el tratamiento.'
        : `Se repite hasta el ${valor.fechaFin.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}, incluido.`;
  } else {
    const ultima = new Date(fechas[fechas.length - 1]);
    resumen = `${fechas.length} ${fechas.length === 1 ? 'toma' : 'tomas'}, la última el ${ultima.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
    })} a las ${ultima.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.`;
  }

  return (
    <View style={styles.container}>
      {permitirCambiarModo && (
        <SegmentedControl
          opciones={[
            { valor: 'semanal', etiqueta: 'Días fijos' },
            { valor: 'intervalo', etiqueta: 'Cada X horas' },
          ]}
          valor={valor.modo}
          onChange={(modo) => cambiar({ modo })}
        />
      )}

      {valor.modo === 'semanal' ? (
        <>
          <DateTimeField label="Hora de la toma" mode="time" value={valor.hora} onChange={(hora) => cambiar({ hora })} />

          <View style={styles.bloque}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Días</Text>
            <View style={styles.diasFila}>
              {DIAS_SEMANA.map((dia) => {
                const activo = valor.dias.includes(dia.iso);
                return (
                  <Pressable
                    key={dia.iso}
                    onPress={() => alternarDia(dia.iso)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: activo }}
                    accessibilityLabel={dia.nombre}
                    style={[styles.diaChip, { backgroundColor: activo ? colors.primary : colors.fill }]}
                  >
                    <Text
                      style={[typography.bodySmall, { color: activo ? '#FFFFFF' : colors.textSecondary, fontWeight: '600' }]}
                    >
                      {dia.etiqueta}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.bloque}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Duración</Text>
            <SegmentedControl
              opciones={[
                { valor: 'indefinido', etiqueta: 'Indefinido' },
                { valor: 'hasta', etiqueta: 'Hasta una fecha' },
              ]}
              valor={valor.duracion}
              onChange={(duracion) => cambiar({ duracion })}
            />
          </View>
          {valor.duracion === 'hasta' && (
            <DateTimeField label="Último día" mode="date" value={valor.fechaFin} onChange={(fechaFin) => cambiar({ fechaFin })} />
          )}
        </>
      ) : (
        <>
          <View style={styles.fila}>
            <View style={styles.campoFlexible}>
              <TextField
                label="Cada"
                sufijo="horas"
                keyboardType="number-pad"
                value={valor.frecuenciaHoras}
                onChangeText={(t) => cambiar({ frecuenciaHoras: soloEntero(t) })}
              />
            </View>
            <View style={styles.campoFlexible}>
              <TextField
                label="Durante"
                sufijo="días"
                keyboardType="number-pad"
                value={valor.duracionDias}
                onChangeText={(t) => cambiar({ duracionDias: soloEntero(t) })}
              />
            </View>
          </View>
          <View style={styles.fila}>
            <View style={styles.campoFlexible}>
              <DateTimeField label="Primera toma" mode="date" value={valor.inicio} onChange={(inicio) => cambiar({ inicio })} />
            </View>
            <View style={styles.campoFlexible}>
              <DateTimeField label="Hora" mode="time" value={valor.inicio} onChange={(inicio) => cambiar({ inicio })} />
            </View>
          </View>
        </>
      )}

      <View style={[styles.resumen, { backgroundColor: error ? colors.errorSoft : colors.primarySoft }]}>
        <Text style={[typography.bodySmall, { color: error ? colors.error : colors.primary }]}>{resumen}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  fila: { flexDirection: 'row', gap: spacing.md },
  campoFlexible: { flex: 1 },
  bloque: { gap: spacing.xs },
  diasFila: { flexDirection: 'row', gap: spacing.xs, justifyContent: 'space-between' },
  diaChip: {
    flex: 1,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  resumen: { padding: spacing.sm + 2, borderRadius: radii.sm },
});
