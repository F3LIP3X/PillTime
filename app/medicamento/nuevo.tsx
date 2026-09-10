import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScanBarcode } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { DateTimeField } from '@/components/DateTimeField';
import { BarcodeScannerView } from '@/features/codigo-barras/components/BarcodeScannerView';
import { useBarcodeLookup } from '@/features/codigo-barras/hooks/useBarcodeLookup';
import { useCrearMedicamento } from '@/features/medicamentos/hooks/useCrearMedicamento';
import { useCrearHorario } from '@/features/medicamentos/hooks/useCrearHorario';
import { useCrearTratamientoIntervalo } from '@/features/medicamentos/hooks/useCrearTratamientoIntervalo';
import { useTheme } from '@/theme/useTheme';
import { spacing, MIN_TOUCH_TARGET } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { MOMENTO_COMIDA, type MomentoComida } from '@/db/schema';

const ETIQUETA_MOMENTO: Record<MomentoComida, string> = {
  antes: 'Antes de comer',
  despues: 'Después de comer',
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
  const { colors, esOscuro } = useTheme();
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

  const handleGuardar = async () => {
    if (!nombre.trim() || !dosis.trim()) return;
    if (modo === 'cronico' && diasSeleccionados.length === 0) return;
    if (modo === 'tratamiento' && (!Number(frecuenciaHoras) || !Number(duracionDias))) return;

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
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <TextField label="Nombre" value={nombre} onChangeText={setNombre} />
      <TextField label="Dosis (ej. 500 mg)" value={dosis} onChangeText={setDosis} />

      <View style={styles.fila}>
        <TextField
          label="Unidades por toma"
          keyboardType="numeric"
          value={unidadesPorToma}
          onChangeText={setUnidadesPorToma}
          style={styles.mitad}
        />
        <TextField
          label="Stock inicial"
          keyboardType="numeric"
          value={stockInicial}
          onChangeText={setStockInicial}
          style={styles.mitad}
        />
      </View>

      <View>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Con la comida</Text>
        <View style={styles.opciones}>
          {MOMENTO_COMIDA.map((momento) => (
            <Pressable
              key={momento}
              onPress={() => setMomentoComida(momento)}
              accessibilityRole="radio"
              accessibilityState={{ checked: momentoComida === momento }}
              style={[
                styles.chip,
                {
                  backgroundColor: momentoComida === momento ? colors.primary : esOscuro ? '#1B2626' : '#FFFFFF',
                  borderColor: colors.textSecondary + '33',
                },
              ]}
            >
              <Text style={[typography.bodySmall, { color: momentoComida === momento ? '#FFFFFF' : colors.text }]}>
                {ETIQUETA_MOMENTO[momento]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Pauta</Text>
        <View style={styles.opciones}>
          <Pressable
            onPress={() => setModo('cronico')}
            accessibilityRole="radio"
            accessibilityState={{ checked: modo === 'cronico' }}
            style={[
              styles.chip,
              {
                backgroundColor: modo === 'cronico' ? colors.primary : esOscuro ? '#1B2626' : '#FFFFFF',
                borderColor: colors.textSecondary + '33',
              },
            ]}
          >
            <Text style={[typography.bodySmall, { color: modo === 'cronico' ? '#FFFFFF' : colors.text }]}>
              Crónico (días fijos)
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setModo('tratamiento')}
            accessibilityRole="radio"
            accessibilityState={{ checked: modo === 'tratamiento' }}
            style={[
              styles.chip,
              {
                backgroundColor: modo === 'tratamiento' ? colors.primary : esOscuro ? '#1B2626' : '#FFFFFF',
                borderColor: colors.textSecondary + '33',
              },
            ]}
          >
            <Text style={[typography.bodySmall, { color: modo === 'tratamiento' ? '#FFFFFF' : colors.text }]}>
              Tratamiento (cada X horas)
            </Text>
          </Pressable>
        </View>
      </View>

      {modo === 'cronico' ? (
        <>
          <View>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Hora de la toma</Text>
            <DateTimeField label="Hora" mode="time" value={hora} onChange={setHora} />
          </View>

          <View>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Días</Text>
            <View style={styles.opciones}>
              {DIAS_SEMANA.map((dia) => (
                <Pressable
                  key={dia.iso}
                  onPress={() => alternarDia(dia.iso)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: diasSeleccionados.includes(dia.iso) }}
                  accessibilityLabel={dia.etiqueta}
                  style={[
                    styles.diaChip,
                    {
                      backgroundColor: diasSeleccionados.includes(dia.iso)
                        ? colors.secondary
                        : esOscuro
                          ? '#1B2626'
                          : '#FFFFFF',
                      borderColor: colors.textSecondary + '33',
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.bodySmall,
                      { color: diasSeleccionados.includes(dia.iso) ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {dia.etiqueta}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={styles.fila}>
            <TextField
              label="Cada cuántas horas"
              keyboardType="numeric"
              value={frecuenciaHoras}
              onChangeText={setFrecuenciaHoras}
              style={styles.mitad}
            />
            <TextField
              label="Duración (días)"
              keyboardType="numeric"
              value={duracionDias}
              onChangeText={setDuracionDias}
              style={styles.mitad}
            />
          </View>
          <View style={styles.fila}>
            <DateTimeField label="Fecha primera toma" mode="date" value={fechaInicio} onChange={setFechaInicio} />
            <DateTimeField label="Hora primera toma" mode="time" value={fechaInicio} onChange={setFechaInicio} />
          </View>
        </>
      )}

      <View style={styles.fila}>
        <TextField
          label="Código de barras (opcional)"
          value={codigoBarras}
          onChangeText={setCodigoBarras}
          style={styles.codigoInput}
        />
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
        label="Notas / alertas (opcional)"
        value={notas}
        onChangeText={setNotas}
        multiline
        style={styles.notas}
      />

      <Button label={guardando ? 'Guardando…' : 'Guardar medicamento'} onPress={handleGuardar} />

      <Modal visible={escaneando} animationType="slide">
        <BarcodeScannerView onScanned={handleEscaneado} />
        <Button label="Cancelar" variant="secondary" onPress={() => setEscaneando(false)} />
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  fila: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-end' },
  mitad: { flex: 1 },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  diaChip: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: MIN_TOUCH_TARGET / 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  codigoInput: { flex: 1 },
  botonEscanear: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notas: { minHeight: 80 },
});
