import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Activity, Pencil, Plus } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Pressable3D } from '@/components/Pressable3D';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { TIPO_MEDIDA_SALUD, type TipoMedidaSalud } from '@/db/schema';
import { useMedidasSalud } from '@/features/medidas-salud/hooks/useMedidasSalud';
import { EditarMedidaModal } from '@/features/medidas-salud/components/EditarMedidaModal';

const ETIQUETA_TIPO: Record<TipoMedidaSalud, string> = {
  peso: 'Peso',
  tension: 'Tensión',
  glucosa: 'Glucosa',
  sintoma: 'Síntoma',
  animo: 'Ánimo',
};

/** La unidad se muestra junto a la cifra: un número suelto no dice nada. */
const UNIDAD_TIPO: Record<TipoMedidaSalud, string> = {
  peso: 'kg',
  tension: 'mmHg',
  glucosa: 'mg/dl',
  sintoma: '',
  animo: '/10',
};

export default function Medidas() {
  const { colors } = useTheme();
  const [tipo, setTipo] = useState<TipoMedidaSalud>('peso');
  const [valor1, setValor1] = useState('');
  const [valor2, setValor2] = useState('');
  const { medidas, registrar, actualizar, eliminar } = useMedidasSalud(tipo);
  const [medidaEditando, setMedidaEditando] = useState<(typeof medidas)[number] | null>(null);

  const esTension = tipo === 'tension';
  const unidad = UNIDAD_TIPO[tipo];

  const handleRegistrar = async () => {
    const numero1 = Number(valor1.replace(',', '.'));
    if (!numero1) return;
    await registrar({
      valor1: numero1,
      valor2: esTension ? Number(valor2.replace(',', '.')) || undefined : undefined,
      fechaHora: new Date().toISOString(),
    });
    setValor1('');
    setValor2('');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.cabecera}>
        <SegmentedControl
          opciones={TIPO_MEDIDA_SALUD.map((t) => ({ valor: t, etiqueta: ETIQUETA_TIPO[t] }))}
          valor={tipo}
          onChange={(t) => {
            setTipo(t);
            setValor1('');
            setValor2('');
          }}
          desplazable
        />

        <Card>
          <Text style={[typography.overline, { color: colors.textTertiary }]}>Nuevo registro</Text>
          <View style={styles.filaCampos}>
            <View style={styles.campoFlexible}>
              <TextField
                label={esTension ? 'Sistólica' : ETIQUETA_TIPO[tipo]}
                sufijo={unidad || undefined}
                keyboardType="numeric"
                value={valor1}
                onChangeText={setValor1}
                placeholder="0"
              />
            </View>
            {esTension && (
              <View style={styles.campoFlexible}>
                <TextField
                  label="Diastólica"
                  sufijo={unidad}
                  keyboardType="numeric"
                  value={valor2}
                  onChangeText={setValor2}
                  placeholder="0"
                />
              </View>
            )}
          </View>
          <View style={styles.botonRegistrar}>
            <Button
              label="Registrar"
              icono={<Plus color="#FFFFFF" size={18} />}
              disabled={!valor1.trim()}
              onPress={handleRegistrar}
            />
          </View>
        </Card>
      </View>

      <FlatList
        data={medidas}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          medidas.length > 0 ? (
            <Text style={[typography.overline, styles.tituloGrupo, { color: colors.textTertiary }]}>
              Historial de {ETIQUETA_TIPO[tipo].toLowerCase()}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icono={<Activity color={colors.primary} size={30} />}
            titulo={`Sin registros de ${ETIQUETA_TIPO[tipo].toLowerCase()}`}
            descripcion="Anota un valor arriba y se irá guardando aquí con su fecha."
          />
        }
        renderItem={({ item }) => (
          <Card sinPadding style={styles.tarjetaMedida}>
            <Pressable3D onPress={() => setMedidaEditando(item)} escala={0.985}>
              <View style={styles.filaMedida}>
                <View style={styles.valorBloque}>
                  <Text style={[typography.title, { color: colors.text }]}>
                    {item.valor1}
                    {item.valor2 ? ` / ${item.valor2}` : ''}
                  </Text>
                  {!!unidad && (
                    <Text style={[typography.caption, { color: colors.textTertiary }]}>{unidad}</Text>
                  )}
                </View>
                <Text style={[typography.caption, styles.fechaMedida, { color: colors.textSecondary }]}>
                  {new Date(item.fechaHora).toLocaleString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                <Pencil color={colors.textTertiary} size={16} />
              </View>
            </Pressable3D>
          </Card>
        )}
      />

      <EditarMedidaModal
        medida={medidaEditando}
        esTension={esTension}
        onClose={() => setMedidaEditando(null)}
        onGuardar={actualizar}
        onEliminar={eliminar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cabecera: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.md },
  filaCampos: { flexDirection: 'row', gap: spacing.md },
  campoFlexible: { flex: 1 },
  botonRegistrar: { marginTop: spacing.xs },
  lista: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg, flexGrow: 1 },
  tituloGrupo: { marginTop: spacing.lg, marginBottom: spacing.sm, marginLeft: spacing.xs },
  tarjetaMedida: { marginBottom: spacing.sm },
  filaMedida: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  valorBloque: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  fechaMedida: { flex: 1, textAlign: 'right' },
});
