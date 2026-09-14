import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScanBarcode } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateTimeField } from '@/components/DateTimeField';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Selector } from '@/components/Selector';
import { TextField } from '@/components/TextField';
import { MOMENTO_COMIDA, type MomentoComida } from '@/db/schema';
import { BarcodeScannerView } from '@/features/codigo-barras/components/BarcodeScannerView';
import { useBarcodeLookup } from '@/features/codigo-barras/hooks/useBarcodeLookup';
import { useTheme } from '@/theme/useTheme';
import { ALTO_CONTROL, spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';
import {
  separarDosis,
  soloDecimal,
  soloEntero,
  UNIDADES_DOSIS,
  type EstadoFormularioMedicamento,
} from '../formulario';

const ETIQUETA_MOMENTO: Record<MomentoComida, string> = {
  antes: 'Antes',
  despues: 'Después',
  ninguno: 'Indiferente',
};

type Props = {
  valor: EstadoFormularioMedicamento;
  onChange: (valor: EstadoFormularioMedicamento) => void;
};

/**
 * Datos del medicamento, compartidos por el alta y la edición para que
 * editar permita cambiar exactamente lo mismo que se pudo escribir al
 * crearlo (petición de beta testers: la edición se quedaba corta).
 */
export function CamposMedicamento({ valor, onChange }: Props) {
  const { colors } = useTheme();
  const buscarCodigoBarras = useBarcodeLookup();
  const [escaneando, setEscaneando] = useState(false);
  const cambiar = (parcial: Partial<EstadoFormularioMedicamento>) => onChange({ ...valor, ...parcial });

  // Una unidad antigua que no está en la lista se ofrece igualmente, para
  // no cambiarla sin que el usuario lo decida.
  const unidades = (UNIDADES_DOSIS as readonly string[]).includes(valor.dosisUnidad)
    ? [...UNIDADES_DOSIS]
    : [...UNIDADES_DOSIS, valor.dosisUnidad];

  const handleEscaneado = async (codigo: string) => {
    setEscaneando(false);
    const aprendido = await buscarCodigoBarras(codigo);
    if (!aprendido) {
      cambiar({ codigoBarras: codigo });
      return;
    }
    const dosis = aprendido.dosis ? separarDosis(aprendido.dosis) : null;
    cambiar({
      codigoBarras: codigo,
      nombre: aprendido.nombre,
      ...(dosis ? { dosisCantidad: dosis.cantidad, dosisUnidad: dosis.unidad || valor.dosisUnidad } : {}),
      ...(aprendido.notas ? { notas: aprendido.notas } : {}),
    });
  };

  const dosisInvalida = valor.dosisCantidad !== '' && !(Number(valor.dosisCantidad.replace(',', '.')) > 0);

  return (
    <>
      <View style={styles.grupo}>
        <Text style={[typography.overline, styles.tituloGrupo, { color: colors.textTertiary }]}>Medicamento</Text>
        <Card>
          <View style={styles.interior}>
          <TextField label="Nombre" value={valor.nombre} onChangeText={(nombre) => cambiar({ nombre })} placeholder="Ibuprofeno" />

          <View style={styles.fila}>
            <View style={styles.campoDosis}>
              <TextField
                label="Dosis"
                keyboardType="decimal-pad"
                value={valor.dosisCantidad}
                onChangeText={(t) => cambiar({ dosisCantidad: soloDecimal(t) })}
                placeholder="600"
                error={dosisInvalida}
                ayuda={
                  dosisInvalida
                    ? 'Tiene que ser mayor que 0.'
                    : valor.dosisAnterior
                      ? `Antes ponía «${valor.dosisAnterior}».`
                      : undefined
                }
              />
            </View>
            <View style={styles.campoUnidad}>
              <Selector
                label="Unidad"
                titulo="Unidad de la dosis"
                opciones={unidades.map((u) => ({ valor: u, etiqueta: u }))}
                valor={valor.dosisUnidad}
                onChange={(dosisUnidad) => cambiar({ dosisUnidad })}
              />
            </View>
          </View>

          <View style={styles.fila}>
            <View style={styles.campoFlexible}>
              <TextField
                label="Unidades por toma"
                keyboardType="number-pad"
                value={valor.unidadesPorToma}
                onChangeText={(t) => cambiar({ unidadesPorToma: soloEntero(t) })}
              />
            </View>
            <View style={styles.campoFlexible}>
              <TextField
                label="Unidades en la caja"
                keyboardType="number-pad"
                value={valor.stockInicial}
                onChangeText={(t) => cambiar({ stockInicial: soloEntero(t) })}
                placeholder="0"
              />
            </View>
          </View>

          <View style={styles.bloque}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Con la comida</Text>
            <SegmentedControl
              opciones={MOMENTO_COMIDA.map((m) => ({ valor: m, etiqueta: ETIQUETA_MOMENTO[m] }))}
              valor={valor.momentoComida}
              onChange={(momentoComida) => cambiar({ momentoComida })}
            />
          </View>
          </View>
        </Card>
      </View>

      <View style={styles.grupo}>
        <Text style={[typography.overline, styles.tituloGrupo, { color: colors.textTertiary }]}>Opcional</Text>
        <Card>
          <View style={styles.interior}>
          <DateTimeField
            label="Fecha de caducidad"
            mode="date"
            opcional
            placeholder="Sin fecha"
            value={valor.fechaCaducidad}
            onChange={(fechaCaducidad) => cambiar({ fechaCaducidad })}
          />

          <View style={styles.filaCodigo}>
            <View style={styles.campoFlexible}>
              <TextField
                label="Código de barras"
                keyboardType="number-pad"
                value={valor.codigoBarras}
                onChangeText={(t) => cambiar({ codigoBarras: soloEntero(t) })}
              />
            </View>
            <Pressable
              onPress={() => setEscaneando(true)}
              accessibilityRole="button"
              accessibilityLabel="Escanear código de barras"
              style={[styles.botonEscanear, { backgroundColor: colors.primary }]}
            >
              <ScanBarcode color={colors.onPrimary} size={22} />
            </Pressable>
          </View>

          <TextField
            label="Notas y alertas"
            value={valor.notas}
            onChangeText={(notas) => cambiar({ notas })}
            multiline
            placeholder="Ej. puede causar somnolencia"
            style={styles.notas}
          />
          </View>
        </Card>
      </View>

      <Modal visible={escaneando} animationType="slide" onRequestClose={() => setEscaneando(false)}>
        <View style={styles.escaner}>
          <BarcodeScannerView onScanned={handleEscaneado} />
          <View style={[styles.pieEscaner, { backgroundColor: colors.background }]}>
            <Button label="Cancelar" variant="secondary" onPress={() => setEscaneando(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: spacing.sm },
  tituloGrupo: { marginLeft: spacing.xs },
  interior: { gap: spacing.md },
  fila: { flexDirection: 'row', gap: spacing.md },
  campoFlexible: { flex: 1 },
  campoDosis: { flex: 3 },
  campoUnidad: { flex: 2 },
  bloque: { gap: spacing.xs },
  filaCodigo: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  botonEscanear: {
    width: ALTO_CONTROL,
    height: ALTO_CONTROL,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notas: { minHeight: 88, textAlignVertical: 'top' },
  escaner: { flex: 1 },
  pieEscaner: { padding: spacing.md },
});
