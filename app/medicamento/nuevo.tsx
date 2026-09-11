import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScanBarcode } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { DateTimeField } from '@/components/DateTimeField';
import { SegmentedControl } from '@/components/SegmentedControl';
import { BarcodeScannerView } from '@/features/codigo-barras/components/BarcodeScannerView';
import { useBarcodeLookup } from '@/features/codigo-barras/hooks/useBarcodeLookup';
import { useCrearMedicamento } from '@/features/medicamentos/hooks/useCrearMedicamento';
import { useCrearHorario } from '@/features/medicamentos/hooks/useCrearHorario';
import { useCrearTratamientoIntervalo } from '@/features/medicamentos/hooks/useCrearTratamientoIntervalo';
import { useTheme } from '@/theme/useTheme';
import { spacing, MIN_TOUCH_TARGET } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';
import { MOMENTO_COMIDA, type MomentoComida } from '@/db/schema';

const ETIQUETA_MOMENTO: Record<MomentoComida, string> = {
  antes: 'Antes',
  despues: 'Después',
  ninguno: 'Indiferente',
};

const DIAS_SEMANA = [
  { iso: 1, etiqueta: 'L' },
  { iso: 2, etiqueta: 'M' },
  { iso: 3, etiqueta: 'X' },
  { iso: 4, etiqueta: 'J' },
  { iso: 5, etiqueta: 'V' },
  { iso: 6, etiqueta: 'S' },
  { iso: 7, etiqueta: 'D' },
];

export default function NuevoMedicamento() {
  const { colors } = useTheme();
  const router = useRouter();
  const crearMedicamento = useCrearMedicamento();
  const crearHorario = useCrearHorario();
  const crearTratamientoIntervalo = useCrearTratamientoIntervalo();
  const buscarCodigoBarras = useBarcodeLookup();

  const [modo, setModo] = useState<'cronico' | 'tratamiento'>('cronico');

  const [nombre, setNombre] = useState('');
  const [dosis, setDosis] = useState('');
  const [unidadesPorToma, setUnidadesPorToma] = useState('1');
  const [stockInicial, setStockInicial] = useState('');
  const [momentoComida, setMomentoComida] = useState<MomentoComida>('ninguno');
  const [notas, setNotas] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');

  // Modo 'cronico' (horario 'semanal'): hora fija + días de la semana, indefinido.
  const [hora, setHora] = useState(new Date());
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);

  // Modo 'tratamiento' (horario 'intervalo'): frecuencia + duración, con fin.
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [frecuenciaHoras, setFrecuenciaHoras] = useState('8');
  const [duracionDias, setDuracionDias] = useState('7');

  const [escaneando, setEscaneando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const alternarDia = (iso: number) => {
    setDiasSeleccionados((dias) => (dias.includes(iso) ? dias.filter((d) => d !== iso) : [...dias, iso]));
  };

  const handleEscaneado = async (codigo: string) => {
    setEscaneando(false);
    setCodigoBarras(codigo);
    const aprendido = await buscarCodigoBarras(codigo);
    if (aprendido) {
      setNombre(aprendido.nombre);
      if (aprendido.dosis) setDosis(aprendido.dosis);
      if (aprendido.notas) setNotas(aprendido.notas);
    }
  };

  const totalTomasPrevistas =
    modo === 'tratamiento' && Number(frecuenciaHoras) > 0
      ? Math.floor((Number(duracionDias) * 24) / Number(frecuenciaHoras))
      : 0;

  const puedeGuardar =
    nombre.trim().length > 0 &&
    dosis.trim().length > 0 &&
    (modo === 'cronico' ? diasSeleccionados.length > 0 : Number(frecuenciaHoras) > 0 && Number(duracionDias) > 0);

  const handleGuardar = async () => {
    if (!puedeGuardar) return;

    setGuardando(true);
    try {
      const medicamento = await crearMedicamento({
        nombre: nombre.trim(),
        dosis: dosis.trim(),
        unidadesPorToma: Number(unidadesPorToma) || 1,
        stockInicial: Number(stockInicial) || 0,
        momentoComida,
        codigoBarras: codigoBarras.trim() || undefined,
        notas: notas.trim() || undefined,
      });

      if (modo === 'cronico') {
        const horaTexto = `${String(hora.getHours()).padStart(2, '0')}:${String(hora.getMinutes()).padStart(2, '0')}`;
        await crearHorario({ medicamentoId: medicamento.id, hora: horaTexto, diasSemana: diasSeleccionados });
      } else {
        await crearTratamientoIntervalo({
          medicamentoId: medicamento.id,
          nombreMedicamento: medicamento.nombre,
          momentoComida: medicamento.momentoComida,
          fechaHoraInicio: fechaInicio,
          frecuenciaHoras: Number(frecuenciaHoras),
          duracionDias: Number(duracionDias),
        });
      }
      router.back();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={[styles.pantalla, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.grupo}>
          <Text style={[typography.overline, styles.tituloGrupo, { color: colors.textTertiary }]}>Medicamento</Text>
          <Card>
            <TextField label="Nombre" value={nombre} onChangeText={setNombre} placeholder="Ibuprofeno" />
            <TextField label="Dosis" value={dosis} onChangeText={setDosis} placeholder="600 mg" />

            <View style={styles.fila}>
              <View style={styles.campoFlexible}>
                <TextField
                  label="Unidades por toma"
                  keyboardType="numeric"
                  value={unidadesPorToma}
                  onChangeText={setUnidadesPorToma}
                />
              </View>
              <View style={styles.campoFlexible}>
                <TextField
                  label="Unidades en la caja"
                  keyboardType="numeric"
                  value={stockInicial}
                  onChangeText={setStockInicial}
                  placeholder="0"
                />
              </View>
            </View>

            <View style={styles.bloque}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Con la comida</Text>
              <SegmentedControl
                opciones={MOMENTO_COMIDA.map((m) => ({ valor: m, etiqueta: ETIQUETA_MOMENTO[m] }))}
                valor={momentoComida}
                onChange={setMomentoComida}
              />
            </View>
          </Card>
        </View>

        <View style={styles.grupo}>
          <Text style={[typography.overline, styles.tituloGrupo, { color: colors.textTertiary }]}>Pauta</Text>
          <Card>
            <SegmentedControl
              opciones={[
                { valor: 'cronico', etiqueta: 'Días fijos' },
                { valor: 'tratamiento', etiqueta: 'Cada X horas' },
              ]}
              valor={modo}
              onChange={setModo}
            />

            {modo === 'cronico' ? (
              <>
                <DateTimeField label="Hora de la toma" mode="time" value={hora} onChange={setHora} />
                <View style={styles.bloque}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Días</Text>
                  <View style={styles.diasFila}>
                    {DIAS_SEMANA.map((dia) => {
                      const activo = diasSeleccionados.includes(dia.iso);
                      return (
                        <Pressable
                          key={dia.iso}
                          onPress={() => alternarDia(dia.iso)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: activo }}
                          accessibilityLabel={dia.etiqueta}
                          style={[
                            styles.diaChip,
                            { backgroundColor: activo ? colors.primary : colors.fill },
                          ]}
                        >
                          <Text
                            style={[
                              typography.bodySmall,
                              { color: activo ? '#FFFFFF' : colors.textSecondary, fontWeight: '600' },
                            ]}
                          >
                            {dia.etiqueta}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.fila}>
                  <View style={styles.campoFlexible}>
                    <TextField
                      label="Cada"
                      ayuda="horas"
                      keyboardType="numeric"
                      value={frecuenciaHoras}
                      onChangeText={setFrecuenciaHoras}
                    />
                  </View>
                  <View style={styles.campoFlexible}>
                    <TextField
                      label="Durante"
                      ayuda="días"
                      keyboardType="numeric"
                      value={duracionDias}
                      onChangeText={setDuracionDias}
                    />
                  </View>
                </View>
                <View style={styles.fila}>
                  <View style={styles.campoFlexible}>
                    <DateTimeField label="Primera toma" mode="date" value={fechaInicio} onChange={setFechaInicio} />
                  </View>
                  <View style={styles.campoFlexible}>
                    <DateTimeField label="Hora" mode="time" value={fechaInicio} onChange={setFechaInicio} />
                  </View>
                </View>
                {totalTomasPrevistas > 0 && (
                  <View style={[styles.resumen, { backgroundColor: colors.primarySoft }]}>
                    <Text style={[typography.bodySmall, { color: colors.primary }]}>
                      Se crearán {totalTomasPrevistas} tomas, la última el{' '}
                      {new Date(
                        fechaInicio.getTime() +
                          (totalTomasPrevistas - 1) * Number(frecuenciaHoras) * 60 * 60 * 1000,
                      ).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                      .
                    </Text>
                  </View>
                )}
              </>
            )}
          </Card>
        </View>

        <View style={styles.grupo}>
          <Text style={[typography.overline, styles.tituloGrupo, { color: colors.textTertiary }]}>Opcional</Text>
          <Card>
            <View style={styles.filaCodigo}>
              <View style={styles.campoFlexible}>
                <TextField label="Código de barras" value={codigoBarras} onChangeText={setCodigoBarras} />
              </View>
              <Pressable
                onPress={() => setEscaneando(true)}
                accessibilityRole="button"
                accessibilityLabel="Escanear código de barras"
                style={[styles.botonEscanear, { backgroundColor: colors.primary }]}
              >
                <ScanBarcode color="#FFFFFF" size={22} />
              </Pressable>
            </View>
            <TextField
              label="Notas y alertas"
              value={notas}
              onChangeText={setNotas}
              multiline
              placeholder="Ej. puede causar somnolencia"
              style={styles.notas}
            />
          </Card>
        </View>
      </ScrollView>

      <View style={[styles.pieAccion, { backgroundColor: colors.background, borderTopColor: colors.separator }]}>
        <Button
          label={guardando ? 'Guardando…' : 'Guardar medicamento'}
          onPress={handleGuardar}
          disabled={!puedeGuardar || guardando}
        />
      </View>

      <Modal visible={escaneando} animationType="slide">
        <View style={styles.escaner}>
          <BarcodeScannerView onScanned={handleEscaneado} />
          <View style={[styles.pieEscaner, { backgroundColor: colors.background }]}>
            <Button label="Cancelar" variant="secondary" onPress={() => setEscaneando(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  container: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
  grupo: { gap: spacing.sm },
  tituloGrupo: { marginLeft: spacing.xs },
  fila: { flexDirection: 'row', gap: spacing.md },
  campoFlexible: { flex: 1 },
  bloque: { gap: spacing.xs, marginTop: spacing.xs },
  diasFila: { flexDirection: 'row', gap: spacing.xs, justifyContent: 'space-between' },
  diaChip: {
    flex: 1,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  resumen: { padding: spacing.sm + 2, borderRadius: radii.sm, marginTop: spacing.xs },
  filaCodigo: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  botonEscanear: {
    width: 50,
    height: 50,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notas: { minHeight: 88, textAlignVertical: 'top', paddingTop: spacing.sm },
  pieAccion: { padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  escaner: { flex: 1 },
  pieEscaner: { padding: spacing.md },
});
